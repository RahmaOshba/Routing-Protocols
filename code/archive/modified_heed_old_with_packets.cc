#include "ns3/core-module.h"
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

#include "ns3/command-line.h"
using namespace ns3;
using namespace std;

// ============================================================================
// MODIFIED HEED (Fix 1 + Fix 2 + light rotation penalty) -- WITH REAL
// PACKET VISUALIZATION
// ns-3.41 / C++
//
// This file ADDS a rotation-fairness mechanism NOT present in published
// HEED (see heed_ROTATION_FIX.cc header for full rationale) on top of the
// "Original HEED" bug fixes. Cite this as "Modified HEED" / your own
// contribution, not as "Original HEED", in the thesis.
// ============================================================================

struct SensorNode {
    uint32_t id = 0;
    double x = 0.0;
    double y = 0.0;
    double energy = 0.0;
    bool alive = true;
    bool tentative = false;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
    uint32_t degree = 0;
    double cost = 0.0;
    double chProb = 0.0;
    uint32_t chTimesServed = 0;  // Modified HEED: light rotation-fairness counter
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
    uint32_t heedIterations = 0;
    vector<pair<uint32_t, uint32_t>> transmissions; // NEW: (senderId, receiverId) for visualization
};

// ----------------------------- Network -------------------------------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double E0 = 0.5;       // J/node
static constexpr double RANGE = 25.0;   // m

// ------------------------------- HEED --------------------------------------
static constexpr double CPROB = 0.20;
static constexpr double PMIN = 0.05;
// Modified HEED addition (NOT part of published HEED): light rotation
// penalty so frequently-served hub nodes gradually share the CH role.
static constexpr double ROTATION_LAMBDA = 0.1;

// --------------------------- Radio / traffic -------------------------------
static constexpr uint32_t PACKET_BITS = 2000;
static constexpr uint32_t CONTROL_BITS = 200;
static constexpr double E_ELEC = 50e-9;
static constexpr double E_FS = 10e-12;
static constexpr double E_MP = 0.0013e-12;
static constexpr double E_DA = 5e-9;
static constexpr double DATA_RATE = 250000.0;
static constexpr double LIGHT = 3.0e8;

static constexpr uint32_t MAX_ROUNDS = 2000;
static constexpr uint32_t SEED = 12345;

// FIX: limit real packet sends to first N rounds (avoid WiFi collision-domain
// slowdown since there's no propagation loss model -- see leach file for details).
static constexpr uint32_t PACKET_VIS_MAX_ROUND = 30;

// ----------------------------- Visualization packet layer -----------------
static constexpr uint16_t VIS_PORT = 9000;
static constexpr uint32_t VIS_PACKET_SIZE = 32;

// ----------------------------- Geometry ------------------------------------
static double Dist(const SensorNode& a, const SensorNode& b) { return hypot(a.x - b.x, a.y - b.y); }
static double DistBS(const SensorNode& a) { return hypot(a.x - BSX, a.y - BSY); }
static double D0() { return sqrt(E_FS / E_MP); }

static double TxEnergy(uint32_t bits, double d)
{
    if (d <= 0.0) return bits * E_ELEC;
    if (d < D0()) return bits * (E_ELEC + E_FS * d * d);
    return bits * (E_ELEC + E_MP * pow(d, 4.0));
}
static double RxEnergy(uint32_t bits) { return bits * E_ELEC; }
static double AggEnergy(uint32_t bits) { return bits * E_DA; }
static double TxTimeSec(uint32_t bits) { return static_cast<double>(bits) / DATA_RATE; }
static double DelayMs(uint32_t bits, double d) { return (TxTimeSec(bits) + d / LIGHT) * 1000.0; }

static vector<vector<uint32_t>> BuildNeighbors(const vector<SensorNode>& nodes)
{
    vector<vector<uint32_t>> nb(N);
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive) continue;
        for (uint32_t j = 0; j < N; ++j) {
            if (i == j || !nodes[j].alive) continue;
            if (Dist(nodes[i], nodes[j]) <= RANGE) nb[i].push_back(j);
        }
    }
    return nb;
}

static void UpdateCost(vector<SensorNode>& nodes, const vector<vector<uint32_t>>& nb)
{
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive) {
            nodes[i].degree = 0;
            nodes[i].cost = numeric_limits<double>::infinity();
            continue;
        }
        nodes[i].degree = static_cast<uint32_t>(nb[i].size());
        // FIX 1 + Modified-HEED rotation penalty
        const double base = 1.0 / (static_cast<double>(nodes[i].degree) + 1.0);
        const double penalty = 1.0 + ROTATION_LAMBDA * static_cast<double>(nodes[i].chTimesServed);
        nodes[i].cost = base * penalty;
    }
}

static uint32_t BestCH(const vector<uint32_t>& candidates, const vector<SensorNode>& nodes)
{
    NS_ASSERT(!candidates.empty());
    uint32_t best = candidates.front();
    for (uint32_t c : candidates) {
        if (nodes[c].cost < nodes[best].cost ||
            (fabs(nodes[c].cost - nodes[best].cost) < 1e-12 && c < best))
            best = c;
    }
    return best;
}

static uint32_t RunHEED(vector<SensorNode>& nodes, const vector<vector<uint32_t>>& nb, mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) {
        n.tentative = false;
        n.finalCH = false;
        n.clusterHead = numeric_limits<uint32_t>::max();
        n.chProb = n.alive ? max(CPROB * n.energy / E0, PMIN) : 0.0;
    }

    for (auto& n : nodes)
        if (n.alive && U(rng) <= n.chProb) n.tentative = true;

    uint32_t iterations = 0;
    while (iterations < 64) {
        ++iterations;
        vector<bool> oldT(N, false), oldF(N, false), newT(N, false), newF(N, false);

        bool allAtOne = true;
        for (uint32_t i = 0; i < N; ++i) {
            oldT[i] = nodes[i].tentative;
            oldF[i] = nodes[i].finalCH;
            if (nodes[i].alive && nodes[i].chProb < 1.0 - 1e-12) allAtOne = false;
        }

        for (uint32_t i = 0; i < N; ++i) {
            if (!nodes[i].alive) continue;
            if (oldF[i]) { newF[i] = true; continue; }

            vector<uint32_t> sch;
            for (uint32_t c : nb[i])
                if (nodes[c].alive && (oldT[c] || oldF[c])) sch.push_back(c);
            if (oldT[i]) sch.push_back(i);
            sort(sch.begin(), sch.end());
            sch.erase(unique(sch.begin(), sch.end()), sch.end());

            if (!sch.empty()) {
                if (BestCH(sch, nodes) == i) newT[i] = true;
            } else {
                if (U(rng) <= nodes[i].chProb) newT[i] = true;
            }
        }

        for (uint32_t i = 0; i < N; ++i) {
            nodes[i].tentative = newT[i];
            nodes[i].finalCH = newF[i];
        }
        for (auto& n : nodes)
            if (n.alive) n.chProb = min(2.0 * n.chProb, 1.0);

        if (allAtOne) break;
    }

    for (auto& n : nodes)
        if (n.alive && n.tentative) n.finalCH = true;

    auto liveNb = BuildNeighbors(nodes);
    vector<bool> visited(N, false);
    for (uint32_t start = 0; start < N; ++start) {
        if (!nodes[start].alive || visited[start]) continue;
        vector<uint32_t> component;
        vector<uint32_t> q{start};
        visited[start] = true;
        for (size_t h = 0; h < q.size(); ++h) {
            uint32_t u = q[h];
            component.push_back(u);
            for (uint32_t v : liveNb[u])
                if (!visited[v]) { visited[v] = true; q.push_back(v); }
        }
        bool hasCH = false;
        for (uint32_t id : component) if (nodes[id].finalCH) { hasCH = true; break; }
        if (!hasCH) {
            uint32_t best = component.front();
            for (uint32_t id : component)
                if (nodes[id].energy > nodes[best].energy ||
                    (fabs(nodes[id].energy - nodes[best].energy) < 1e-12 && id < best))
                    best = id;
            nodes[best].finalCH = true;
        }
    }

    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();
        if (!n.alive) continue;
        if (n.finalCH) { n.clusterHead = n.id; continue; }
        vector<uint32_t> candidates;
        for (uint32_t c : nb[n.id]) if (nodes[c].alive && nodes[c].finalCH) candidates.push_back(c);
        if (!candidates.empty()) n.clusterHead = BestCH(candidates, nodes);
    }

    return iterations;
}

static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round, uint32_t heedIterations)
{
    RoundResult r;
    r.round = round;
    r.heedIterations = heedIterations;

    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive) continue;
        double e = heedIterations * TxEnergy(CONTROL_BITS, RANGE);
        if (e >= nodes[i].energy) { nodes[i].energy = 0.0; nodes[i].alive = false; }
        else { nodes[i].energy -= e; r.controlTx += heedIterations; }
    }

    auto liveNb = BuildNeighbors(nodes);
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive) continue;
        double e = static_cast<double>(liveNb[i].size()) * heedIterations * RxEnergy(CONTROL_BITS);
        if (e >= nodes[i].energy) { nodes[i].energy = 0.0; nodes[i].alive = false; }
        else { nodes[i].energy -= e; r.controlRx += static_cast<uint64_t>(liveNb[i].size()) * heedIterations; }
    }

    for (auto& n : nodes) if (!n.alive) n.finalCH = false;
    liveNb = BuildNeighbors(nodes);

    for (auto& n : nodes) {
        if (!n.alive) { n.clusterHead = numeric_limits<uint32_t>::max(); continue; }
        if (n.finalCH) { n.clusterHead = n.id; continue; }
        vector<uint32_t> candidates;
        for (uint32_t c : liveNb[n.id]) if (nodes[c].alive && nodes[c].finalCH) candidates.push_back(c);
        n.clusterHead = candidates.empty() ? numeric_limits<uint32_t>::max() : BestCH(candidates, nodes);
    }

    for (const auto& n : nodes) if (n.alive && n.finalCH) ++r.chCount;

    // Modified HEED: update rotation-fairness counter
    for (auto& n : nodes) if (n.alive && n.finalCH) ++n.chTimesServed;

    for (const auto& n : nodes) if (n.alive) ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDeliveredToCH(N, false);
    vector<double> delayToCH(N, 0.0);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) { ++r.unclustered; continue; }
        double d = Dist(nodes[i], nodes[c]);
        if (d > RANGE) { ++r.unclustered; continue; }
        double tx = TxEnergy(PACKET_BITS, d);
        double rx = RxEnergy(PACKET_BITS);
        if (tx > nodes[i].energy || rx > nodes[c].energy) { ++r.lost; continue; }
        nodes[i].energy -= tx;
        nodes[c].energy -= rx;
        ++r.dataTx; ++r.dataRx;
        ++membersPerCH[c];
        memberDeliveredToCH[i] = true;
        delayToCH[i] = DelayMs(PACKET_BITS, d);

        r.transmissions.emplace_back(i, c);  // NEW
    }

    double delaySum = 0.0;
    uint32_t deliveredSources = 0;

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);
        if (agg > nodes[c].energy) { ++r.lost; nodes[c].energy = 0.0; nodes[c].alive = false; continue; }
        nodes[c].energy -= agg;
        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);
        if (txBS > nodes[c].energy) { ++r.lost; nodes[c].energy = 0.0; nodes[c].alive = false; continue; }
        nodes[c].energy -= txBS;
        ++r.dataTx; ++r.dataRx;
        deliveredSources += members + 1;
        delaySum += DelayMs(PACKET_BITS, dBS);

        r.transmissions.emplace_back(c, N);  // NEW: CH -> sink

        for (uint32_t i = 0; i < N; ++i)
            if (memberDeliveredToCH[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, dBS);
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    double after = 0.0;
    uint32_t assigned = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) { n.energy = 0.0; n.alive = false; }
        after += n.energy;
        if (n.alive) ++r.alive;
        if (n.alive && !n.finalCH && n.clusterHead < N &&
            nodes[n.clusterHead].alive && nodes[n.clusterHead].finalCH)
            ++assigned;
    }

    r.dead = N - r.alive;
    r.energyUsed = max(0.0, before - after);
    r.residualEnergy = after;
    r.avgClusterSize = r.chCount ? static_cast<double>(assigned + r.chCount) / r.chCount : 0.0;

    if (r.alive == 0) {
        r.chCount = 0; r.generated = 0; r.delivered = 0; r.lost = 0; r.unclustered = 0;
        r.avgClusterSize = 0.0; r.avgDelayMs = 0.0; r.pdr = 0.0; r.throughputKbps = 0.0;
    }

    r.pdr = r.generated ? static_cast<double>(r.delivered) / r.generated : 0.0;
    r.avgDelayMs = r.delivered ? delaySum / r.delivered : 0.0;

    const double controlTime = static_cast<double>(r.controlTx) * TxTimeSec(CONTROL_BITS);
    const double dataTxTime = static_cast<double>(r.dataTx) * TxTimeSec(PACKET_BITS);
    r.roundDurationSec = controlTime + dataTxTime;
    r.throughputKbps = r.roundDurationSec > 0.0
        ? static_cast<double>(r.delivered * PACKET_BITS) / r.roundDurationSec / 1000.0 : 0.0;

    return r;
}

static void ApplyVisualState(AnimationInterface* anim, uint32_t nodeId, const SensorNode& n,
                             const vector<SensorNode>& snapshot)
{
    if (!n.alive) { anim->UpdateNodeColor(nodeId, 120, 120, 120); anim->UpdateNodeDescription(nodeId, ""); return; }
    if (n.finalCH) { anim->UpdateNodeColor(nodeId, 255, 80, 80); anim->UpdateNodeDescription(nodeId, "CH " + to_string(n.id)); return; }
    if (n.clusterHead < N && snapshot[n.clusterHead].alive && snapshot[n.clusterHead].finalCH) {
        static const uint8_t palette[][3] = {
            {80,160,255},{80,210,140},{190,120,255},{255,170,70},{70,200,210},{220,100,170},
            {150,190,80},{120,120,230},{230,140,110},{100,210,190},{180,160,90},{160,110,210}
        };
        constexpr uint32_t paletteSize = sizeof(palette) / sizeof(palette[0]);
        const uint32_t idx = snapshot[n.clusterHead].id % paletteSize;
        anim->UpdateNodeColor(nodeId, palette[idx][0], palette[idx][1], palette[idx][2]);
        anim->UpdateNodeDescription(nodeId, "");
        return;
    }
    anim->UpdateNodeColor(nodeId, 220, 220, 220);
    anim->UpdateNodeDescription(nodeId, "");
}

int main(int argc, char* argv[])
{
    CommandLine cmd;
    cmd.Parse(argc, argv);

    cout << "\n========================================\n";
    cout << "  MODIFIED HEED (+rotation) + REAL PACKET VISUALIZATION\n";
    cout << "========================================\n";
    cout << "Cprob=" << CPROB << " pMin=" << PMIN
         << " | Cost=[1/(degree+1)]x[1+" << ROTATION_LAMBDA << "*timesServed]\n";
    cout << "========================================\n";

    mt19937 rng(SEED);
    uniform_real_distribution<double> pos(0.0, AREA);
    vector<SensorNode> nodes(N);

    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].id = i;
        nodes[i].x = pos(rng);
        nodes[i].y = pos(rng);
        nodes[i].energy = E0;
        nodes[i].alive = true;
        nodes[i].chTimesServed = 0;
    }

    // ---- Position export for the Python cluster-circle visualizer ----
    ofstream positions("node-positions.csv");
    positions << "Node,X,Y\n";
    for (const auto& n : nodes) positions << n.id << ',' << n.x << ',' << n.y << '\n';
    positions << N << ',' << BSX << ',' << BSY << '\n';
    positions.close();

    NodeContainer visualNodes;
    visualNodes.Create(N + 1);

    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator>();
    for (const auto& n : nodes) positionAlloc->Add(Vector(n.x, n.y, 0.0));
    positionAlloc->Add(Vector(BSX, BSY, 0.0));

    MobilityHelper mobility;
    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(visualNodes);

    // ---- Real WiFi ad-hoc network for packet visualization ----
    YansWifiChannelHelper channel = YansWifiChannelHelper::Default();
    channel.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
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

    vector<Ptr<Socket>> sockets(N + 1);
    for (uint32_t i = 0; i <= N; ++i) {
        sockets[i] = Socket::CreateSocket(visualNodes.Get(i), UdpSocketFactory::GetTypeId());
        sockets[i]->Bind(InetSocketAddress(Ipv4Address::GetAny(), VIS_PORT));
    }

    AnimationInterface anim("heed-MODIFIED-clustering.xml");
    anim.SetMaxPktsPerTraceFile(5000000);  // FIX: avoid "Max Packets per trace file exceeded"
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.EnablePacketMetadata(true);
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);

    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("heed-MODIFIED-results.csv");
    ofstream energy("heed-MODIFIED-node-energy.csv");
    ofstream lifetime("heed-MODIFIED-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "HEED_Iterations,Control_TX,Control_RX,Data_TX,Data_RX,"
              "Energy_Used_J,Residual_Energy_J,Avg_Cluster_Size,Avg_Delay_ms,"
              "PDR,Round_Duration_s,Throughput_kbps\n";
    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0, HND = 0, LND = 0;
    bool fnd = false, hnd = false;
    vector<uint32_t> deathRound(N, 0);
    uint64_t totalGenerated = 0, totalDelivered = 0;
    double totalUsed = 0.0;

    cout << "\nSimulation starts...\n";

    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        auto nb = BuildNeighbors(nodes);
        UpdateCost(nodes, nb);
        uint32_t heedIterations = RunHEED(nodes, nb, rng);
        RoundResult r = SimulateRound(nodes, round, heedIterations);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = static_cast<double>(round);
        Simulator::Schedule(Seconds(visualTime), [&anim, visualSnapshot]() {
            for (const auto& n : visualSnapshot) ApplyVisualState(&anim, n.id, n, visualSnapshot);
        });

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
               << r.round << ',' << r.alive << ',' << r.dead << ',' << r.chCount << ','
               << r.generated << ',' << r.delivered << ',' << r.lost << ',' << r.unclustered << ','
               << r.heedIterations << ',' << r.controlTx << ',' << r.controlRx << ','
               << r.dataTx << ',' << r.dataRx << ',' << r.energyUsed << ',' << r.residualEnergy << ','
               << r.avgClusterSize << ',' << r.avgDelayMs << ',' << r.pdr << ','
               << r.roundDurationSec << ',' << r.throughputKbps << '\n';

        for (const auto& n : nodes) {
            energy << round << ',' << n.id << ',' << setprecision(10) << n.energy << ','
                   << (n.alive ? 1 : 0) << ',' << (n.alive && n.finalCH ? 1 : 0) << ','
                   << (n.clusterHead < N ? to_string(n.clusterHead) : "-1") << '\n';
            if (!n.alive && deathRound[n.id] == 0) deathRound[n.id] = round;
        }

        if (!fnd && r.dead >= 1) { FND = round; fnd = true; }
        if (!hnd && r.alive <= N / 2) { HND = round; hnd = true; }

        cout << fixed << setprecision(4)
             << "Round " << setw(4) << round << " | Alive=" << setw(3) << r.alive
             << " | CH=" << setw(3) << r.chCount << " | PDR=" << setw(7) << r.pdr
             << " | Residual=" << setw(9) << r.residualEnergy << " J\n";

        if (r.alive == 0) { LND = round; break; }
    }

    if (LND == 0) {
        for (const auto& n : nodes) if (n.alive) { LND = 0; break; }
        if (LND == 0) for (uint32_t d : deathRound) LND = max(LND, d);
    }

    for (uint32_t i = 0; i < N; ++i)
        lifetime << i << ',' << (deathRound[i] ? to_string(deathRound[i]) : "Not_Dead") << '\n';

    rounds.close(); energy.close(); lifetime.close();

    Simulator::Stop(Seconds(static_cast<double>(MAX_ROUNDS) + 2.0));
    Simulator::Run();
    Simulator::Destroy();

    const double overallPdr = totalGenerated ? static_cast<double>(totalDelivered) / totalGenerated : 0.0;

    cout << "\n========================================\n";
    cout << "             FINAL RESULTS\n";
    cout << "========================================\n";
    cout << "FND = " << (fnd ? to_string(FND) : "Not reached") << " rounds\n";
    cout << "HND = " << (hnd ? to_string(HND) : "Not reached") << " rounds\n";
    cout << "LND = " << (LND ? to_string(LND) : "Not reached") << " rounds\n";
    cout << fixed << setprecision(6);
    cout << "Total Energy Used = " << totalUsed << " J\n";
    cout << "Overall PDR = " << overallPdr << "\n";
    cout << "\nCSV/XML outputs:\n";
    cout << "  heed-MODIFIED-results.csv\n";
    cout << "  heed-MODIFIED-node-energy.csv\n";
    cout << "  heed-MODIFIED-node-lifetime.csv\n";
    cout << "  heed-MODIFIED-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
