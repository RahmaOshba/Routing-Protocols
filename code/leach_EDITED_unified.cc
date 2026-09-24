// ============================================================================
// LEACH -- EDITED (unified environment for fair cross-protocol comparison)
// ns-3.41 / C++
//
// Same algorithm as the original paper (threshold-based rotation, P_CH=0.05),
// but the ENVIRONMENT is standardized to match HEED/SH-LEACH/EECH-HEED
// exactly: BS at field center (50,50), two-slope Efs/Emp/d0 radio model,
// packet=2000 bits, N=100, 100x100m field. This is the version to use for
// direct, apples-to-apples comparison against the other protocols.
// For a paper-faithful reproduction instead, see leach_ORIGINAL.cc.
// ============================================================================
#include "ns3/core-module.h"
#include "ns3/command-line.h"
#include "ns3/mobility-module.h"
#include "ns3/netanim-module.h"
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
// LEACH ALGORITHMIC BASELINE - BUG-FIXED VERSION
// ns-3.41 / C++
//
// FIX APPLIED (vs. original leach.cc):
//   The original RunLEACH() capped the number of cluster heads to
//   `desiredCH = ceil(P_CH * aliveCount)` and RANDOMLY TRUNCATED any
//   excess candidates -- including nodes that were GUARANTEED to become
//   CH by LEACH's own threshold formula (T(n) reaches exactly 1.0 on the
//   last round of every epoch, forcing ALL not-yet-served eligible nodes
//   to qualify). That truncation silently discarded most of those
//   guaranteed nodes, breaking LEACH's core fairness guarantee (every
//   node becomes CH exactly once every 1/P_CH rounds). This produced the
///  "weird"/inconsistent CH selection pattern observed when running it.
//
//   FIX: removed the artificial desiredCH cap entirely. The number of
//   CHs each round is now exactly whatever the threshold mechanism
//   naturally produces (as in standard/textbook LEACH) -- no random
//   truncation. The only safeguard kept is: if NO node passes the
//   threshold in a given round (rare), force one eligible node to become
//   CH so the network never has zero cluster heads.
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

    // ------------------------------------------------------------------
    // FIX: no artificial cap / truncation here anymore. Every node that
    // passes its threshold this round becomes a real CH, exactly as in
    // standard LEACH. This preserves the guarantee that a node forced to
    // threshold=1.0 (last round of its epoch) WILL actually become CH,
    // instead of being randomly discarded.
    // ------------------------------------------------------------------
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

    // ---------------- SETUP: ADVERTISEMENT + JOIN + TDMA ----------------
    // Phase 1: CH advertisement.
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

    // Cleaning CH flags for dead nodes after Phase 1
    for (auto& n : nodes) {
        if (!n.alive)
            n.finalCH = false;
    }

    // Phase 2: Cluster association
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

    // Phase 3: Member -> CH join requests
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

    // Phase 4: TDMA schedule broadcast
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

    // Recalculate alive count & active CH count cleanly
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

    if (r.chCount > r.alive) {
        NS_FATAL_ERROR("LEACH invariant violated: CH count exceeds alive nodes.");
    }

    // Final cluster re-association after setup deaths
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

    // Data packet generation
    for (const auto& n : nodes)
        if (n.alive)
            ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    // ---------------- MEMBER -> CH ----------------
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
    }

    // ---------------- CH AGGREGATION + CH -> BS ----------------
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

        for (uint32_t i = 0; i < N; ++i) {
            if (memberDelivered[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, dBS);
        }
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    // ---------------- FINAL STATE / METRICS ----------------
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
    cout << "        LEACH COMPLETE BASELINE (FIXED)\n";
    cout << "========================================\n";
    cout << "Nodes = " << N << "\n";
    cout << "Area = " << AREA << " x " << AREA << " m\n";
    cout << "BS = (" << BSX << ", " << BSY << ")\n";
    cout << "Initial Energy = " << E0 << " J/node\n";
    cout << "CH Probability P = " << P_CH << "\n";
    cout << "Epoch = " << EPOCH << " rounds\n";
    cout << "Reference control range = " << RANGE << " m\n";
    cout << "Packet = " << PACKET_BITS << " bits\n";
    cout << "Radio d0 = " << D0() << " m\n";
    cout << "Metrics = analytical baseline (not PHY/MAC packet-level)\n";
    cout << "Connectivity = no hard range cutoff; distance affects energy\n";
    cout << "LEACH G-set = reset at the start of every 20-round epoch\n";
    cout << "FIX = removed artificial CH-count truncation (see header comment)\n";
    cout << "Visualization = leach-clustering.xml (NetAnim)\n";
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

    NodeContainer visualNodes;
    visualNodes.Create(N + 1);

    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator>();
    for (const auto& n : nodes)
        positionAlloc->Add(Vector(n.x, n.y, 0.0));
    positionAlloc->Add(Vector(BSX, BSY, 0.0));

    MobilityHelper mobility;
    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(visualNodes);

    AnimationInterface anim("leach-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
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

    Simulator::Stop(Seconds(static_cast<double>(MAX_ROUNDS) + 1.0));
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
    cout << "  leach-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
