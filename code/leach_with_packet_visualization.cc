#include "ns3/core-module.h"
#include "ns3/command-line.h"
#include "ns3/mobility-module.h"
#include "ns3/netanim-module.h"
#include "ns3/wifi-module.h"
#include "ns3/internet-module.h"
#include "ns3/network-module.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <random>
#include <string>
#include <vector>

using namespace ns3;
using namespace std;

// ============================================================================
// LEACH -- WITH REAL PACKET VISUALIZATION LAYER
// ns-3.41 / C++
//
// WHAT CHANGED vs. leach_FIXED.cc:
//   All energy/FND/HND/LND/PDR results below come from EXACTLY the same
//   analytical model as before -- nothing about the energy bookkeeping
//   changed. What's NEW is a parallel, purely-visual layer: a real
//   802.11 ad-hoc WiFi network connecting all nodes, over which a small
//   dummy UDP packet is actually sent for every member->CH and CH->sink
//   transmission the analytical model decides happens. This makes
//   NetAnim show real moving packet dots between nodes (via
//   EnablePacketMetadata), instead of only color changes.
//
//   IMPORTANT: the WiFi channel has NO propagation loss model (packets
//   always reach their destination physically) so that the VISUAL layer
//   never disagrees with the ANALYTICAL layer's success/failure decision
//   -- the analytical model remains the single source of truth for all
//   reported metrics (FND, HND, LND, PDR, energy, etc.). Occasional
//   WiFi-level collisions between simultaneously-scheduled dummy packets
//   are cosmetic only and do not affect any reported number.
// ============================================================================

struct SensorNode {
    uint32_t id = 0;
    double x = 0.0;
    double y = 0.0;
    double energy = 0.0;
    bool alive = true;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
    bool selectedThisEpoch = false;
};

struct RoundResult {
    uint32_t round = 0;
    uint32_t alive = 0;
    uint32_t dead = 0;
    uint32_t chCount = 0;
    uint32_t generated = 0;
    uint32_t delivered = 0;
    uint32_t lost = 0;
    uint32_t unclustered = 0;
    uint64_t controlTx = 0;
    uint64_t controlRx = 0;
    uint64_t dataTx = 0;
    uint64_t dataRx = 0;
    double energyUsed = 0.0;
    double residualEnergy = 0.0;
    double avgClusterSize = 0.0;
    double avgDelayMs = 0.0;
    double pdr = 0.0;
    double throughputKbps = 0.0;
    double roundDurationSec = 0.0;
    uint32_t leachEpoch = 0;
    vector<pair<uint32_t, uint32_t>> transmissions; // NEW: (senderId, receiverId) pairs for this round, for visualization
};

// ----------------------------- Network -------------------------------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double E0 = 0.5;       // J/node
static constexpr double RANGE = 25.0;   // m (reference control TX distance)

// ------------------------------- LEACH --------------------------------------
static constexpr double P_CH = 0.05;
static constexpr uint32_t EPOCH = 20;   // 1 / P_CH

// --------------------------- Radio / traffic -------------------------------
static constexpr uint32_t PACKET_BITS = 2000;
static constexpr uint32_t CONTROL_BITS = 200;
static constexpr double E_ELEC = 50e-9;       // J/bit
static constexpr double E_FS = 10e-12;        // J/bit/m^2
static constexpr double E_MP = 0.0013e-12;    // J/bit/m^4
static constexpr double E_DA = 5e-9;          // J/bit
static constexpr double DATA_RATE = 250000.0; // bit/s
static constexpr double LIGHT = 3.0e8;        // m/s

static constexpr uint32_t MAX_ROUNDS = 2000;
static constexpr uint32_t SEED = 12345;

// FIX: real WiFi packet sends are only scheduled for the first this-many
// rounds. Beyond that, only the (cheap) node-color updates continue.
// Reason: with no propagation loss model, every node can "hear" every
// other node -- the whole network becomes one WiFi collision domain, and
// scheduling real contentious transmissions for 1000+ rounds makes
// Simulator::Run() extremely slow / appear to hang. ~30 rounds is more
// than enough to visually confirm packets are flowing correctly.
static constexpr uint32_t PACKET_VIS_MAX_ROUND = 30;

// ----------------------------- Visualization packet layer -----------------
static constexpr uint16_t VIS_PORT = 9000;
static constexpr uint32_t VIS_PACKET_SIZE = 32; // bytes, dummy payload

// ----------------------------- Geometry ------------------------------------
static double Dist(const SensorNode& a, const SensorNode& b)
{
    return hypot(a.x - b.x, a.y - b.y);
}

static double DistBS(const SensorNode& a)
{
    return hypot(a.x - BSX, a.y - BSY);
}

static double D0()
{
    return sqrt(E_FS / E_MP);
}

// --------------------------- Energy model ----------------------------------
static double TxEnergy(uint32_t bits, double d)
{
    if (d <= 0.0)
        return bits * E_ELEC;

    if (d < D0())
        return bits * (E_ELEC + E_FS * d * d);

    return bits * (E_ELEC + E_MP * pow(d, 4.0));
}

static double RxEnergy(uint32_t bits)
{
    return bits * E_ELEC;
}

static double AggEnergy(uint32_t bits)
{
    return bits * E_DA;
}

static double TxTimeSec(uint32_t bits)
{
    return static_cast<double>(bits) / DATA_RATE;
}

static double DelayMs(uint32_t bits, double d)
{
    return (TxTimeSec(bits) + d / LIGHT) * 1000.0;
}

// ------------------------------ LEACH ---------------------------------------
static double Threshold(uint32_t round)
{
    const uint32_t r = (round - 1) % EPOCH;
    const double denominator = 1.0 - P_CH * static_cast<double>(r);
    return denominator > 0.0 ? P_CH / denominator : 1.0;
}

static bool EligibleForCH(const SensorNode& n)
{
    return n.alive && !n.selectedThisEpoch;
}

static uint32_t RunLEACH(vector<SensorNode>& nodes,
                         uint32_t round,
                         mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) {
        n.finalCH = false;
        n.clusterHead = numeric_limits<uint32_t>::max();
    }

    if ((round - 1) % EPOCH == 0) {
        for (auto& n : nodes)
            n.selectedThisEpoch = false;
    }

    const double t = Threshold(round);

    vector<uint32_t> candidates;
    candidates.reserve(N);

    for (auto& n : nodes) {
        if (!EligibleForCH(n))
            continue;

        if (U(rng) <= t)
            candidates.push_back(n.id);
    }

    // FIX (from earlier LEACH debugging session): no artificial
    // truncation of candidates -- everyone who passes the threshold
    // becomes a real CH, preserving LEACH's fairness guarantee.
    if (candidates.empty()) {
        vector<uint32_t> eligible;
        for (const auto& n : nodes)
            if (EligibleForCH(n))
                eligible.push_back(n.id);

        if (!eligible.empty()) {
            uniform_int_distribution<uint32_t> pick(0, eligible.size() - 1);
            candidates.push_back(eligible[pick(rng)]);
        }
    }

    for (uint32_t id : candidates) {
        nodes[id].finalCH = true;
        nodes[id].selectedThisEpoch = true;
    }

    uint32_t chCount = 0;
    for (const auto& n : nodes)
        if (n.alive && n.finalCH)
            ++chCount;

    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();

        if (!n.alive)
            continue;

        if (n.finalCH) {
            n.clusterHead = n.id;
            continue;
        }

        double bestDistance = numeric_limits<double>::infinity();
        uint32_t bestCH = numeric_limits<uint32_t>::max();

        for (const auto& c : nodes) {
            if (!c.alive || !c.finalCH)
                continue;

            const double d = Dist(n, c);

            if (d < bestDistance - 1e-12 ||
                (fabs(d - bestDistance) < 1e-12 && c.id < bestCH)) {
                bestDistance = d;
                bestCH = c.id;
            }
        }

        if (bestCH != numeric_limits<uint32_t>::max())
            n.clusterHead = bestCH;
    }

    return chCount;
}

// ---------------------------- Round simulation -----------------------------
static RoundResult SimulateRound(vector<SensorNode>& nodes,
                                 uint32_t round,
                                 uint32_t chCount)
{
    RoundResult r;
    r.round = round;
    r.leachEpoch = (round - 1) / EPOCH + 1;

    const double before = [&]() {
        double sum = 0.0;
        for (const auto& n : nodes)
            sum += n.energy;
        return sum;
    }();

    // ---------------- SETUP phases (unchanged from leach_FIXED.cc) ----------------
    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH)
            continue;

        const double tx = TxEnergy(CONTROL_BITS, RANGE);
        if (tx > nodes[c].energy) {
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            nodes[c].finalCH = false;
            continue;
        }

        nodes[c].energy -= tx;
        ++r.controlTx;

        for (uint32_t v = 0; v < N; ++v) {
            if (v == c || !nodes[v].alive)
                continue;

            const double rx = RxEnergy(CONTROL_BITS);
            if (rx > nodes[v].energy) {
                nodes[v].energy = 0.0;
                nodes[v].alive = false;
                nodes[v].finalCH = false;
                continue;
            }

            nodes[v].energy -= rx;
            ++r.controlRx;
        }
    }

    for (auto& n : nodes) {
        if (!n.alive)
            n.finalCH = false;
    }

    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();

        if (!n.alive)
            continue;

        if (n.finalCH) {
            n.clusterHead = n.id;
            continue;
        }

        double bestDistance = numeric_limits<double>::infinity();
        uint32_t bestCH = numeric_limits<uint32_t>::max();

        for (const auto& c : nodes) {
            if (!c.alive || !c.finalCH)
                continue;

            const double d = Dist(n, c);

            if (d < bestDistance - 1e-12 ||
                (fabs(d - bestDistance) < 1e-12 && c.id < bestCH)) {
                bestDistance = d;
                bestCH = c.id;
            }
        }

        n.clusterHead = bestCH;
    }

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH)
            continue;

        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH)
            continue;

        const double d = Dist(nodes[i], nodes[c]);
        const double tx = TxEnergy(CONTROL_BITS, d);
        const double rx = RxEnergy(CONTROL_BITS);

        if (tx > nodes[i].energy || rx > nodes[c].energy) {
            if (tx > nodes[i].energy) { nodes[i].energy = 0.0; nodes[i].alive = false; nodes[i].finalCH = false; }
            if (rx > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; }
            continue;
        }

        nodes[i].energy -= tx;
        nodes[c].energy -= rx;
        ++r.controlTx;
        ++r.controlRx;
    }

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH)
            continue;

        bool hasMember = false;
        for (uint32_t i = 0; i < N; ++i) {
            if (nodes[i].alive && !nodes[i].finalCH && nodes[i].clusterHead == c) {
                hasMember = true;
                break;
            }
        }

        if (!hasMember)
            continue;

        const double tx = TxEnergy(CONTROL_BITS, RANGE);
        if (tx > nodes[c].energy) {
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            nodes[c].finalCH = false;
            continue;
        }

        nodes[c].energy -= tx;
        ++r.controlTx;

        for (uint32_t i = 0; i < N; ++i) {
            if (!nodes[i].alive || nodes[i].finalCH || nodes[i].clusterHead != c)
                continue;

            const double rx = RxEnergy(CONTROL_BITS);
            if (rx > nodes[i].energy) {
                nodes[i].energy = 0.0;
                nodes[i].alive = false;
                nodes[i].finalCH = false;
                continue;
            }

            nodes[i].energy -= rx;
            ++r.controlRx;
        }
    }

    r.alive = 0;
    r.chCount = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) {
            n.energy = 0.0;
            n.alive = false;
            n.finalCH = false;
        }
        if (n.alive) {
            ++r.alive;
            if (n.finalCH)
                ++r.chCount;
        }
    }

    for (auto& n : nodes) {
        if (!n.alive) {
            n.clusterHead = numeric_limits<uint32_t>::max();
            continue;
        }

        if (n.finalCH) {
            n.clusterHead = n.id;
            continue;
        }

        double bestDistance = numeric_limits<double>::infinity();
        uint32_t bestCH = numeric_limits<uint32_t>::max();

        for (const auto& c : nodes) {
            if (!c.alive || !c.finalCH)
                continue;

            const double d = Dist(n, c);

            if (d < bestDistance - 1e-12 ||
                (fabs(d - bestDistance) < 1e-12 && c.id < bestCH)) {
                bestDistance = d;
                bestCH = c.id;
            }
        }

        n.clusterHead = bestCH;
    }

    for (const auto& n : nodes)
        if (n.alive)
            ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    // ---------------- MEMBER -> CH (NOW records transmissions for viz) ----------------
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH)
            continue;

        const uint32_t c = nodes[i].clusterHead;

        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) {
            ++r.unclustered;
            continue;
        }

        const double d = Dist(nodes[i], nodes[c]);
        const double tx = TxEnergy(PACKET_BITS, d);
        const double rx = RxEnergy(PACKET_BITS);

        if (tx > nodes[i].energy || rx > nodes[c].energy) {
            ++r.lost;
            continue;
        }

        nodes[i].energy -= tx;
        nodes[c].energy -= rx;
        ++r.dataTx;
        ++r.dataRx;
        ++membersPerCH[c];
        memberDelivered[i] = true;
        delayToCH[i] = DelayMs(PACKET_BITS, d);

        r.transmissions.emplace_back(i, c);  // NEW: record for visualization
    }

    double delaySum = 0.0;
    uint32_t deliveredSources = 0;

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH)
            continue;

        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);

        if (agg > nodes[c].energy) {
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            nodes[c].finalCH = false;
            ++r.lost;
            continue;
        }

        nodes[c].energy -= agg;

        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);

        if (txBS > nodes[c].energy) {
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            nodes[c].finalCH = false;
            ++r.lost;
            continue;
        }

        nodes[c].energy -= txBS;
        ++r.dataTx;
        ++r.dataRx;

        deliveredSources += members + 1;
        delaySum += DelayMs(PACKET_BITS, dBS);

        r.transmissions.emplace_back(c, N);  // NEW: CH -> sink (node N is the sink)

        for (uint32_t i = 0; i < N; ++i) {
            if (memberDelivered[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, dBS);
        }
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    double after = 0.0;
    uint32_t assigned = 0;

    r.alive = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) {
            n.energy = 0.0;
            n.alive = false;
            n.finalCH = false;
        }

        after += n.energy;

        if (n.alive)
            ++r.alive;

        if (n.alive && !n.finalCH &&
            n.clusterHead < N &&
            nodes[n.clusterHead].alive &&
            nodes[n.clusterHead].finalCH) {
            ++assigned;
        }
    }

    r.dead = N - r.alive;
    r.energyUsed = max(0.0, before - after);
    r.residualEnergy = after;

    r.avgClusterSize = r.chCount
        ? static_cast<double>(assigned + r.chCount) / r.chCount
        : 0.0;

    if (r.alive == 0) {
        r.chCount = 0;
        r.generated = 0;
        r.delivered = 0;
        r.lost = 0;
        r.unclustered = 0;
        r.avgClusterSize = 0.0;
        r.avgDelayMs = 0.0;
        r.pdr = 0.0;
        r.throughputKbps = 0.0;
    }

    r.pdr = r.generated
        ? static_cast<double>(r.delivered) / r.generated
        : 0.0;

    r.avgDelayMs = r.delivered
        ? delaySum / r.delivered
        : 0.0;

    const double controlTime = static_cast<double>(r.controlTx) * TxTimeSec(CONTROL_BITS);
    const double dataTxTime = static_cast<double>(r.dataTx) * TxTimeSec(PACKET_BITS);

    r.roundDurationSec = controlTime + dataTxTime;

    r.throughputKbps = r.roundDurationSec > 0.0
        ? static_cast<double>(r.delivered * PACKET_BITS) / r.roundDurationSec / 1000.0
        : 0.0;

    return r;
}

// ------------------------ NetAnim visualization -----------------------------
static void ApplyVisualState(AnimationInterface* anim,
                             uint32_t nodeId,
                             const SensorNode& n,
                             const vector<SensorNode>& snapshot)
{
    if (!n.alive) {
        anim->UpdateNodeColor(nodeId, 120, 120, 120);
        anim->UpdateNodeDescription(nodeId, "");
        return;
    }

    if (n.finalCH) {
        anim->UpdateNodeColor(nodeId, 255, 80, 80);
        anim->UpdateNodeDescription(nodeId, "CH " + to_string(n.id));
        return;
    }

    if (n.clusterHead < N && snapshot[n.clusterHead].alive &&
        snapshot[n.clusterHead].finalCH) {
        static const uint8_t palette[][3] = {
            {80, 160, 255}, {80, 210, 140}, {190, 120, 255},
            {255, 170, 70}, {70, 200, 210}, {220, 100, 170},
            {150, 190, 80}, {120, 120, 230}, {230, 140, 110},
            {100, 210, 190}, {180, 160, 90}, {160, 110, 210}
        };

        constexpr uint32_t paletteSize = sizeof(palette) / sizeof(palette[0]);
        const uint32_t idx = snapshot[n.clusterHead].id % paletteSize;

        anim->UpdateNodeColor(nodeId,
                              palette[idx][0],
                              palette[idx][1],
                              palette[idx][2]);
        anim->UpdateNodeDescription(nodeId, "");
        return;
    }

    anim->UpdateNodeColor(nodeId, 220, 220, 220);
    anim->UpdateNodeDescription(nodeId, "");
}

// -------------------------------- Main --------------------------------------
int main(int argc, char* argv[])
{
    CommandLine cmd;
    cmd.Parse(argc, argv);

    cout << "\n========================================\n";
    cout << "   LEACH + REAL PACKET VISUALIZATION\n";
    cout << "========================================\n";
    cout << "Nodes = " << N << " + 1 sink\n";
    cout << "Area = " << AREA << " x " << AREA << " m\n";
    cout << "Visualization = leach-clustering.xml (NetAnim, with real packet flight)\n";
    cout << "NOTE: energy/FND/HND/LND/PDR numbers are unaffected by this\n";
    cout << "      layer -- they come purely from the analytical model.\n";
    cout << "========================================\n";

    mt19937 topologyRng(SEED);
    mt19937 electionRng(SEED + 1);
    uniform_real_distribution<double> pos(0.0, AREA);

    vector<SensorNode> nodes(N);

    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].id = i;
        nodes[i].x = pos(topologyRng);
        nodes[i].y = pos(topologyRng);
        nodes[i].energy = E0;
        nodes[i].alive = true;
        nodes[i].finalCH = false;
        nodes[i].clusterHead = numeric_limits<uint32_t>::max();
        nodes[i].selectedThisEpoch = false;
    }

    // ==================== Real node/mobility setup (N sensors + 1 sink) ====================
    NodeContainer visualNodes;
    visualNodes.Create(N + 1);

    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator>();
    for (const auto& n : nodes)
        positionAlloc->Add(Vector(n.x, n.y, 0.0));
    positionAlloc->Add(Vector(BSX, BSY, 0.0));  // node N = sink

    MobilityHelper mobility;
    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(visualNodes);

    // ==================== NEW: Real WiFi ad-hoc network for packet visualization ====================
    // No propagation loss model on purpose: every dummy packet physically
    // reaches its destination, so the visual layer never contradicts the
    // analytical success/failure decisions above. This is ONLY for
    // NetAnim's packet-flight animation.
    YansWifiChannelHelper channel = YansWifiChannelHelper::Default();
    channel.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
    // Intentionally NOT adding a loss model -- see note above.

    YansWifiPhyHelper phy;
    phy.SetChannel(channel.Create());

    WifiHelper wifi;
    wifi.SetStandard(WIFI_STANDARD_80211b);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager",
                                 "DataMode", StringValue("DsssRate1Mbps"),
                                 "ControlMode", StringValue("DsssRate1Mbps"));

    WifiMacHelper mac;
    mac.SetType("ns3::AdhocWifiMac");

    NetDeviceContainer devices = wifi.Install(phy, mac, visualNodes);

    InternetStackHelper internet;
    internet.Install(visualNodes);

    Ipv4AddressHelper ipv4;
    ipv4.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer interfaces = ipv4.Assign(devices);

    // One UDP socket per node, bound to VIS_PORT, used purely to trigger
    // NetAnim's packet-flight animation for visualization.
    vector<Ptr<Socket>> sockets(N + 1);
    for (uint32_t i = 0; i <= N; ++i) {
        sockets[i] = Socket::CreateSocket(visualNodes.Get(i), UdpSocketFactory::GetTypeId());
        sockets[i]->Bind(InetSocketAddress(Ipv4Address::GetAny(), VIS_PORT));
        // No receive callback needed -- we only care about the visual
        // send/receive animation, not application-level processing.
    }

    AnimationInterface anim("leach-clustering.xml");
    anim.SetMaxPktsPerTraceFile(5000000);  // FIX: avoid "Max Packets per trace file exceeded"
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.EnablePacketMetadata(true);  // NEW: show real packet flight
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);

    for (const auto& n : nodes)
        ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("leach-results.csv");
    ofstream energy("leach-node-energy.csv");
    ofstream lifetime("leach-node-lifetime.csv");

    if (!rounds || !energy || !lifetime)
        NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "LEACH_Epoch,Control_TX,Control_RX,Data_TX,Data_RX,"
              "Energy_Used_J,Residual_Energy_J,Avg_Cluster_Size,Avg_Delay_ms,"
              "PDR,Round_Duration_s,Throughput_kbps\n";

    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0;
    uint32_t HND = 0;
    uint32_t LND = 0;
    bool fnd = false;
    bool hnd = false;

    vector<uint32_t> deathRound(N, 0);

    uint64_t totalGenerated = 0;
    uint64_t totalDelivered = 0;
    double totalUsed = 0.0;

    cout << "\nSimulation starts...\n";

    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        const uint32_t chCount = RunLEACH(nodes, round, electionRng);
        RoundResult r = SimulateRound(nodes, round, chCount);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = (round == 1) ? 0.1 : static_cast<double>(round);
        Simulator::Schedule(Seconds(visualTime), [&anim, visualSnapshot]() {
            for (const auto& n : visualSnapshot)
                ApplyVisualState(&anim, n.id, n, visualSnapshot);
        });

        // ==================== Schedule real packet sends (LIMITED to first N rounds) ====================
        if (round <= PACKET_VIS_MAX_ROUND) {
            const size_t txCount = r.transmissions.size();
            for (size_t k = 0; k < txCount; ++k) {
                const uint32_t sender = r.transmissions[k].first;
                const uint32_t receiver = r.transmissions[k].second;
                const double offset = 0.1 + 0.8 * (static_cast<double>(k) / max<size_t>(1, txCount));
                const double sendTime = visualTime + offset;

                Ptr<Socket> senderSocket = sockets[sender];
                Ipv4Address dstAddr = interfaces.GetAddress(receiver);

                Simulator::Schedule(Seconds(sendTime), [senderSocket, dstAddr]() {
                    Ptr<Packet> packet = Create<Packet>(VIS_PACKET_SIZE);
                    senderSocket->SendTo(packet, 0, InetSocketAddress(dstAddr, VIS_PORT));
                });
            }
        }

        totalGenerated += r.generated;
        totalDelivered += r.delivered;
        totalUsed += r.energyUsed;

        rounds << fixed << setprecision(10)
               << r.round << ','
               << r.alive << ','
               << r.dead << ','
               << r.chCount << ','
               << r.generated << ','
               << r.delivered << ','
               << r.lost << ','
               << r.unclustered << ','
               << r.leachEpoch << ','
               << r.controlTx << ','
               << r.controlRx << ','
               << r.dataTx << ','
               << r.dataRx << ','
               << r.energyUsed << ','
               << r.residualEnergy << ','
               << r.avgClusterSize << ','
               << r.avgDelayMs << ','
               << r.pdr << ','
               << r.roundDurationSec << ','
               << r.throughputKbps << '\n';

        for (const auto& n : nodes) {
            energy << round << ','
                   << n.id << ','
                   << setprecision(10) << n.energy << ','
                   << (n.alive ? 1 : 0) << ','
                   << (n.alive && n.finalCH ? 1 : 0) << ','
                   << (n.clusterHead < N ? to_string(n.clusterHead) : "-1")
                   << '\n';

            if (!n.alive && deathRound[n.id] == 0)
                deathRound[n.id] = round;
        }

        if (!fnd && r.dead >= 1) {
            FND = round;
            fnd = true;
        }

        if (!hnd && r.alive <= N / 2) {
            HND = round;
            hnd = true;
        }

        cout << fixed << setprecision(4)
             << "Round " << setw(4) << round
             << " | Alive=" << setw(3) << r.alive
             << " | CH=" << setw(3) << r.chCount
             << " | Generated=" << setw(3) << r.generated
             << " | Delivered=" << setw(3) << r.delivered
             << " | PDR=" << setw(7) << r.pdr
             << " | Residual=" << setw(9) << r.residualEnergy << " J\n";

        if (r.alive == 0) {
            LND = round;
            break;
        }
    }

    if (LND == 0) {
        for (const auto& n : nodes) {
            if (n.alive) {
                LND = 0;
                break;
            }
        }

        if (LND == 0) {
            for (uint32_t d : deathRound)
                LND = max(LND, d);
        }
    }

    for (uint32_t i = 0; i < N; ++i) {
        lifetime << i << ','
                 << (deathRound[i] ? to_string(deathRound[i]) : "Not_Dead")
                 << '\n';
    }

    rounds.close();
    energy.close();
    lifetime.close();

    // NOTE: Stop time must cover the full analytical timeline (rounds)
    // PLUS the trailing 1-second window used for the last round's packet
    // animation, so no scheduled Send() calls are dropped.
    Simulator::Stop(Seconds(static_cast<double>(MAX_ROUNDS) + 2.0));
    Simulator::Run();
    Simulator::Destroy();

    const double overallPdr = totalGenerated
        ? static_cast<double>(totalDelivered) / totalGenerated
        : 0.0;

    cout << "\n========================================\n";
    cout << "             FINAL RESULTS\n";
    cout << "========================================\n";
    cout << "FND = " << (fnd ? to_string(FND) : "Not reached") << " rounds\n";
    cout << "HND = " << (hnd ? to_string(HND) : "Not reached") << " rounds\n";
    cout << "LND = " << (LND ? to_string(LND) : "Not reached") << " rounds\n";
    cout << fixed << setprecision(6);
    cout << "Initial Network Energy = " << N * E0 << " J\n";
    cout << "Total Energy Used      = " << totalUsed << " J\n";
    cout << "Final Residual Energy  = " << max(0.0, N * E0 - totalUsed) << " J\n";
    cout << "Generated Packets      = " << totalGenerated << "\n";
    cout << "Delivered Packets      = " << totalDelivered << "\n";
    cout << "Overall PDR            = " << overallPdr << "\n";
    cout << "\nCSV outputs:\n";
    cout << "  leach-results.csv\n";
    cout << "  leach-node-energy.csv\n";
    cout << "  leach-node-lifetime.csv\n";
    cout << "  leach-clustering.xml  (open in NetAnim to see real packet flight)\n";
    cout << "========================================\n";

    return 0;
}
