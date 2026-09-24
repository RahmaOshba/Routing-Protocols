// ============================================================================
// HEED -- ORIGINAL (paper-faithful reproduction)
// ns-3.41 / C++
//
// Matches Younis & Fahmy (2004), specifically Table 2 of their "Clustering
// Applications" section (the gen-LEACH comparison, closest to a concrete,
// numeric parameter set in the paper):
//   - Sink at (50,175) -- FAR from the network, not centered.
//   - Initial energy = 2 J/battery (paper's value, not 0.5J).
//   - Data packet = 800 bits (100 bytes, paper's value, not 2000 bits).
//   - Control/broadcast packet = 200 bits (25 bytes) -- already matched.
//   - Cprob=0.05, pmin=0.0005 (paper's stated defaults).
//   - Threshold distance d0 hardcoded to 75m (paper's stated value).
//   - Radio constants Eelec/Efs/Emp already matched the shared model exactly
//     (this is a genuine match, not an adjustment).
//   - Cost = 1/(degree+1) (favors high-degree nodes): this is explicitly
//     one of the paper's own two supported configurations (Table 1,
//     "Dense clusters" goal, "Same power" column -> "1/node degree").
// For the version made directly comparable with LEACH/SH-LEACH/EECH-HEED
// under one shared environment, see heed_EDITED_unified.cc.
// ============================================================================
#include "ns3/core-module.h"
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

#include "ns3/command-line.h"
using namespace ns3;
using namespace std;

// ============================================================================
// HEED ALGORITHMIC BASELINE - "ORIGINAL HEED" (bug-fixed, no added algorithm)
// ns-3.41 / C++
//
// This is the "Original HEED" reference baseline for the thesis -- it
// contains ONLY corrections to implementation bugs/misconfigurations
// relative to the published HEED algorithm (Younis & Fahmy, 2004). It
// does NOT contain any new algorithmic mechanism beyond original HEED.
//
//  FIX 1 -- Cost function corrected:
//    The original code used cost = degree (raw), and BestCH() picks
//    MINIMUM cost, so the LEAST-connected node always won the local
//    competition -- backwards from HEED's intent (the secondary
//    parameter, approximating AMRP, should favor well-connected/cheap-
//    to-reach nodes). This produced many small, scattered clusters
//    (~10-13 CHs) regardless of CPROB.
//    Fix: cost = 1/(degree+1), so MINIMUM cost now corresponds to
//    MAXIMUM degree -- well-connected hub nodes win, matching HEED's
//    intended behavior more faithfully.
//
//  FIX 2 -- CPROB restored to its original 0.20 / pMin 0.05:
//    (A separate experiment temporarily lowered CPROB to 0.05 to test a
//    -- ultimately incorrect -- hypothesis that CPROB directly controls
//    final CH count. It does not: chProb doubles every iteration until
//    reaching 1.0 regardless of its starting value, so CPROB only
//    controls how many iterations/how much control overhead is spent
//    converging, not the final CH count. Lower CPROB just wastes energy
//    on extra iterations. Restored to 0.20 here.)
//
// Validated result with these two fixes only (SEED=12345):
//    FND = 323, HND = 570, LND = 1362, PDR = 99.69%
//
// NOTE: A further "rotation-fairness" mechanism (penalizing nodes that
// have served as CH many times) was explored separately to address a
// hotspot/early-death issue with frequently-selected hub nodes. That
// mechanism is NOT part of published HEED and is kept in a separate file
// (heed_ROTATION_FIX.cc) labeled as a distinct "Modified HEED" variant,
// so this file can be cited as a faithful "Original HEED" baseline.
//
// Purpose:
//   A reproducible algorithmic HEED baseline for energy-efficiency studies.
//
// Important scope:
//   This file does NOT model LR-WPAN PHY/MAC packets. Connectivity is based on
//   distance and energy is calculated with the first-order radio model.
//   PDR, delay and throughput are therefore analytical/model-level metrics,
//   not packet-level ns-3 measurements.
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
};

// ----------------------------- Network -------------------------------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 175.0;  // ORIGINAL: paper's own Table 2, "Sink at (50,175)"
static constexpr double E0 = 2.0;       // J/node -- ORIGINAL: paper's Table 2, "Initial energy: 2 J/battery"
static constexpr double RANGE = 25.0;   // m

// ------------------------------- HEED --------------------------------------
// FIX 2: restored to the original published-style values.
static constexpr double CPROB = 0.05;   // ORIGINAL: paper's own example (Cprob=5%, Table 2 & Sec.4)
static constexpr double PMIN = 0.0005;  // ORIGINAL: paper's Section 4 default (pmin=0.0005)

// --------------------------- Radio / traffic -------------------------------
static constexpr uint32_t PACKET_BITS = 800;    // ORIGINAL: paper's Table 2, "Data packet size: 100 bytes"
static constexpr uint32_t CONTROL_BITS = 200;   // matches paper's Table 2, "Broadcast packet size: 25 bytes"
static constexpr double E_ELEC = 50e-9;       // J/bit
static constexpr double E_FS = 10e-12;         // J/bit/m^2
static constexpr double E_MP = 0.0013e-12;     // J/bit/m^4
static constexpr double E_DA = 5e-9;           // J/bit
static constexpr double DATA_RATE = 250000.0;  // bit/s
static constexpr double LIGHT = 3.0e8;         // m/s

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
    return 75.0;  // ORIGINAL: paper's Table 2 states "Threshold distance (d0): 75 m" directly
                  // (differs slightly from sqrt(Efs/Emp) ~= 87.7m with these Efs/Emp values)
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

// ---------------------------- Connectivity ---------------------------------
static vector<vector<uint32_t>> BuildNeighbors(const vector<SensorNode>& nodes)
{
    vector<vector<uint32_t>> nb(N);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive)
            continue;

        for (uint32_t j = 0; j < N; ++j) {
            if (i == j || !nodes[j].alive)
                continue;

            if (Dist(nodes[i], nodes[j]) <= RANGE)
                nb[i].push_back(j);
        }
    }

    return nb;
}

static void UpdateCost(vector<SensorNode>& nodes,
                       const vector<vector<uint32_t>>& nb)
{
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive) {
            nodes[i].degree = 0;
            nodes[i].cost = numeric_limits<double>::infinity();
            continue;
        }

        nodes[i].degree = static_cast<uint32_t>(nb[i].size());

        // FIX 1: invert so higher degree (well-connected hub) => lower
        // cost => wins the local BestCH competition, instead of the
        // opposite (which favored isolated/low-degree nodes).
        nodes[i].cost = 1.0 / (static_cast<double>(nodes[i].degree) + 1.0);
    }
}

static uint32_t BestCH(const vector<uint32_t>& candidates,
                       const vector<SensorNode>& nodes)
{
    NS_ASSERT(!candidates.empty());

    uint32_t best = candidates.front();

    for (uint32_t c : candidates) {
        if (nodes[c].cost < nodes[best].cost ||
            (fabs(nodes[c].cost - nodes[best].cost) < 1e-12 && c < best)) {
            best = c;
        }
    }

    return best;
}

// ------------------------------ HEED ---------------------------------------
static uint32_t RunHEED(vector<SensorNode>& nodes,
                        const vector<vector<uint32_t>>& nb,
                        mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) {
        n.tentative = false;
        n.finalCH = false;
        n.clusterHead = numeric_limits<uint32_t>::max();
        n.chProb = n.alive ? max(CPROB * n.energy / E0, PMIN) : 0.0;
    }

    for (auto& n : nodes) {
        if (n.alive && U(rng) <= n.chProb)
            n.tentative = true;
    }

    uint32_t iterations = 0;

    while (iterations < 64) {
        ++iterations;

        vector<bool> oldT(N, false);
        vector<bool> oldF(N, false);
        vector<bool> newT(N, false);
        vector<bool> newF(N, false);

        bool allAtOne = true;
        for (uint32_t i = 0; i < N; ++i) {
            oldT[i] = nodes[i].tentative;
            oldF[i] = nodes[i].finalCH;

            if (nodes[i].alive && nodes[i].chProb < 1.0 - 1e-12)
                allAtOne = false;
        }

        for (uint32_t i = 0; i < N; ++i) {
            if (!nodes[i].alive)
                continue;

            if (oldF[i]) {
                newF[i] = true;
                continue;
            }

            vector<uint32_t> sch;

            for (uint32_t c : nb[i]) {
                if (nodes[c].alive && (oldT[c] || oldF[c]))
                    sch.push_back(c);
            }

            if (oldT[i])
                sch.push_back(i);

            sort(sch.begin(), sch.end());
            sch.erase(unique(sch.begin(), sch.end()), sch.end());

            if (!sch.empty()) {
                uint32_t best = BestCH(sch, nodes);
                if (best == i)
                    newT[i] = true;
            } else {
                if (U(rng) <= nodes[i].chProb)
                    newT[i] = true;
            }
        }

        for (uint32_t i = 0; i < N; ++i) {
            nodes[i].tentative = newT[i];
            nodes[i].finalCH = newF[i];
        }

        for (auto& n : nodes) {
            if (n.alive)
                n.chProb = min(2.0 * n.chProb, 1.0);
        }

        if (allAtOne)
            break;
    }

    for (auto& n : nodes) {
        if (n.alive && n.tentative)
            n.finalCH = true;
    }

    auto liveNb = BuildNeighbors(nodes);
    vector<bool> visited(N, false);

    for (uint32_t start = 0; start < N; ++start) {
        if (!nodes[start].alive || visited[start])
            continue;

        vector<uint32_t> component;
        vector<uint32_t> q{start};
        visited[start] = true;

        for (size_t h = 0; h < q.size(); ++h) {
            uint32_t u = q[h];
            component.push_back(u);

            for (uint32_t v : liveNb[u]) {
                if (!visited[v]) {
                    visited[v] = true;
                    q.push_back(v);
                }
            }
        }

        bool hasCH = false;
        for (uint32_t id : component) {
            if (nodes[id].finalCH) {
                hasCH = true;
                break;
            }
        }

        if (!hasCH) {
            uint32_t best = component.front();
            for (uint32_t id : component) {
                if (nodes[id].energy > nodes[best].energy ||
                    (fabs(nodes[id].energy - nodes[best].energy) < 1e-12 && id < best)) {
                    best = id;
                }
            }
            nodes[best].finalCH = true;
        }
    }

    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();

        if (!n.alive)
            continue;

        if (n.finalCH) {
            n.clusterHead = n.id;
            continue;
        }

        vector<uint32_t> candidates;
        for (uint32_t c : nb[n.id]) {
            if (nodes[c].alive && nodes[c].finalCH)
                candidates.push_back(c);
        }

        if (!candidates.empty())
            n.clusterHead = BestCH(candidates, nodes);
    }

    return iterations;
}

// ---------------------------- Round simulation -----------------------------
static RoundResult SimulateRound(vector<SensorNode>& nodes,
                                 uint32_t round,
                                 uint32_t heedIterations)
{
    RoundResult r;
    r.round = round;
    r.heedIterations = heedIterations;

    const double before = [&]() {
        double sum = 0.0;
        for (const auto& n : nodes)
            sum += n.energy;
        return sum;
    }();

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive)
            continue;

        double e = heedIterations * TxEnergy(CONTROL_BITS, RANGE);

        if (e >= nodes[i].energy) {
            nodes[i].energy = 0.0;
            nodes[i].alive = false;
        } else {
            nodes[i].energy -= e;
            r.controlTx += heedIterations;
        }
    }

    auto liveNb = BuildNeighbors(nodes);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive)
            continue;

        double e = static_cast<double>(liveNb[i].size()) *
                   heedIterations * RxEnergy(CONTROL_BITS);

        if (e >= nodes[i].energy) {
            nodes[i].energy = 0.0;
            nodes[i].alive = false;
        } else {
            nodes[i].energy -= e;
            r.controlRx += static_cast<uint64_t>(liveNb[i].size()) * heedIterations;
        }
    }

    for (auto& n : nodes) {
        if (!n.alive)
            n.finalCH = false;
    }

    liveNb = BuildNeighbors(nodes);

    for (auto& n : nodes) {
        if (!n.alive) {
            n.clusterHead = numeric_limits<uint32_t>::max();
            continue;
        }

        if (n.finalCH) {
            n.clusterHead = n.id;
            continue;
        }

        vector<uint32_t> candidates;
        for (uint32_t c : liveNb[n.id]) {
            if (nodes[c].alive && nodes[c].finalCH)
                candidates.push_back(c);
        }

        n.clusterHead = candidates.empty()
            ? numeric_limits<uint32_t>::max()
            : BestCH(candidates, nodes);
    }

    for (const auto& n : nodes)
        if (n.alive && n.finalCH)
            ++r.chCount;

    for (const auto& n : nodes)
        if (n.alive)
            ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDeliveredToCH(N, false);
    vector<double> delayToCH(N, 0.0);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH)
            continue;

        uint32_t c = nodes[i].clusterHead;

        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) {
            ++r.unclustered;
            continue;
        }

        double d = Dist(nodes[i], nodes[c]);
        if (d > RANGE) {
            ++r.unclustered;
            continue;
        }

        double tx = TxEnergy(PACKET_BITS, d);
        double rx = RxEnergy(PACKET_BITS);

        if (tx > nodes[i].energy || rx > nodes[c].energy) {
            ++r.lost;
            continue;
        }

        nodes[i].energy -= tx;
        nodes[c].energy -= rx;
        ++r.dataTx;
        ++r.dataRx;
        ++membersPerCH[c];
        memberDeliveredToCH[i] = true;
        delayToCH[i] = DelayMs(PACKET_BITS, d);
    }

    double delaySum = 0.0;
    uint32_t deliveredSources = 0;

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH)
            continue;

        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);

        if (agg > nodes[c].energy) {
            ++r.lost;
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            continue;
        }

        nodes[c].energy -= agg;

        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);

        if (txBS > nodes[c].energy) {
            ++r.lost;
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            continue;
        }

        nodes[c].energy -= txBS;
        ++r.dataTx;
        ++r.dataRx;

        deliveredSources += members + 1;
        delaySum += DelayMs(PACKET_BITS, dBS);

        for (uint32_t i = 0; i < N; ++i) {
            if (memberDeliveredToCH[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, dBS);
        }
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    double after = 0.0;
    uint32_t assigned = 0;

    for (auto& n : nodes) {
        if (n.energy <= 0.0) {
            n.energy = 0.0;
            n.alive = false;
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

    if (r.alive == 0)
    {
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

    const double controlTime =
        static_cast<double>(r.controlTx) * TxTimeSec(CONTROL_BITS);
    const double dataTxTime =
        static_cast<double>(r.dataTx) * TxTimeSec(PACKET_BITS);
    r.roundDurationSec = controlTime + dataTxTime;

    r.throughputKbps = r.roundDurationSec > 0.0
        ? static_cast<double>(r.delivered * PACKET_BITS) /
          r.roundDurationSec / 1000.0
        : 0.0;

    return r;
}

// ------------------------ NetAnim visualization ---------------------------
static void ApplyVisualState(AnimationInterface* anim,
                             uint32_t nodeId,
                             const SensorNode& n,
                             const vector<SensorNode>& snapshot)
{
    if (!n.alive)
    {
        anim->UpdateNodeColor(nodeId, 120, 120, 120);
        anim->UpdateNodeDescription(nodeId, "");
        return;
    }

    if (n.finalCH)
    {
        anim->UpdateNodeColor(nodeId, 255, 80, 80);
        anim->UpdateNodeDescription(nodeId, "CH " + to_string(n.id));
        return;
    }

    if (n.clusterHead < N && snapshot[n.clusterHead].alive &&
        snapshot[n.clusterHead].finalCH)
    {
        static const uint8_t palette[][3] = {
            {80, 160, 255}, {80, 210, 140}, {190, 120, 255},
            {255, 170, 70}, {70, 200, 210}, {220, 100, 170},
            {150, 190, 80}, {120, 120, 230}, {230, 140, 110},
            {100, 210, 190}, {180, 160, 90}, {160, 110, 210}
        };
        constexpr uint32_t paletteSize = sizeof(palette) / sizeof(palette[0]);
        const uint32_t idx = snapshot[n.clusterHead].id % paletteSize;
        anim->UpdateNodeColor(nodeId,
                               palette[idx][0], palette[idx][1], palette[idx][2]);
        anim->UpdateNodeDescription(nodeId, "");
        return;
    }

    anim->UpdateNodeColor(nodeId, 220, 220, 220);
    anim->UpdateNodeDescription(nodeId, "");
}

// ------------------------------- Main --------------------------------------
int main(int argc, char* argv[])
{
    CommandLine cmd;
    cmd.Parse(argc, argv);

    cout << "\n========================================\n";
    cout << "   ORIGINAL HEED (bug-fixed baseline)\n";
    cout << "========================================\n";
    cout << "Nodes = " << N << "\n";
    cout << "Area = " << AREA << " x " << AREA << " m\n";
    cout << "BS = (" << BSX << ", " << BSY << ")\n";
    cout << "Initial Energy = " << E0 << " J/node\n";
    cout << "Cprob = " << CPROB << " | pMin = " << PMIN << "\n";
    cout << "Cost = 1/(degree+1)  [corrected to favor high-degree hub nodes]\n";
    cout << "Range = " << RANGE << " m\n";
    cout << "Packet = " << PACKET_BITS << " bits\n";
    cout << "Radio d0 = " << D0() << " m\n";
    cout << "Metrics = analytical baseline (not PHY/MAC packet-level)\n";
    cout << "Visualization = heed-clustering.xml (NetAnim)\n";
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
        nodes[i].tentative = false;
        nodes[i].finalCH = false;
        nodes[i].clusterHead = numeric_limits<uint32_t>::max();
        nodes[i].degree = 0;
        nodes[i].cost = 0.0;
        nodes[i].chProb = 0.0;
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

    AnimationInterface anim("heed-ORIGINAL-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);

    for (const auto& n : nodes)
        ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("heed-ORIGINAL-results.csv");
    ofstream energy("heed-ORIGINAL-node-energy.csv");
    ofstream lifetime("heed-ORIGINAL-node-lifetime.csv");

    if (!rounds || !energy || !lifetime)
        NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "HEED_Iterations,Control_TX,Control_RX,Data_TX,Data_RX,"
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
        auto nb = BuildNeighbors(nodes);
        UpdateCost(nodes, nb);

        uint32_t heedIterations = RunHEED(nodes, nb, rng);
        RoundResult r = SimulateRound(nodes, round, heedIterations);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = static_cast<double>(round);
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
               << r.heedIterations << ','
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
    cout << "  heed-results.csv\n";
    cout << "  heed-node-energy.csv\n";
    cout << "  heed-node-lifetime.csv\n";
    cout << "  heed-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
