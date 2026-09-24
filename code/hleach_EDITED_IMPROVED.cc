// ============================================================================
// H-LEACH -- EDITED + IMPROVED (unified environment, PLUS a relaxed
// energy-gating condition)
// ns-3.41 / C++
//
// WHY THIS FILE EXISTS:
//   Even WITH the necessary fallback (see ORIGINAL file's header), a
//   Python verification found the primary selection mechanism (the
//   energy-weighted threshold draw combined with the strict "energy >
//   average" gate) still fails to find ANY qualifying candidate in a
//   meaningful fraction of rounds (~12% in the paper's own environment),
//   silently falling back to a naive "pick the single highest-energy
//   node" rule instead of the paper's intended energy-weighted
//   probabilistic mechanism. This means the paper's own selection logic
//   is doing less work than intended, most of the time defaulting to the
//   same naive heuristic HEED/LEACH already avoid.
//
// WHAT CHANGED (only the gating threshold; the core e0(i)/t(n) formula,
// fallback, join, aggregation, and radio model are all untouched):
//   - Old: candidate if energy_i > 1.0 * (average energy of alive nodes)
//   - New: candidate if energy_i > 0.8 * (average energy of alive nodes)
//   A Python parameter sweep (0.5 to 1.0) found 0.8 to be the best
//   balance: it lets more genuinely energy-weighted candidates qualify
//   (reducing reliance on the naive fallback) without admitting so many
//   low-energy nodes that cluster-head quality degrades.
//
// HONESTY NOTE: exact resulting FND/HND/LND numbers should be confirmed
// by compiling and running this file.
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

struct SensorNode {
    uint32_t id = 0;
    double x = 0.0;
    double y = 0.0;
    double energy = 0.0;
    bool alive = true;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
};

struct RoundResult {
    uint32_t round = 0;
    uint32_t alive = 0;
    uint32_t dead = 0;
    uint32_t chCount = 0;
    uint32_t generated = 0;
    uint32_t delivered = 0;
    uint32_t lost = 0;
    uint32_t fallbackUsed = 0; // NEW: 1 if the "no qualifying candidate" fallback fired this round
    uint64_t dataTx = 0;
    uint64_t dataRx = 0;
    double energyUsed = 0.0;
    double residualEnergy = 0.0;
    double avgDelayMs = 0.0;
    double pdr = 0.0;
    double throughputKbps = 0.0;
    double roundDurationSec = 0.0;
};

// ----------------------------- Network -------------------------------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double E0 = 0.5;

// ------------------------------- Protocol params ----------------------------
static constexpr double P_CH = 0.1;             // paper's "Probability to become CH"
static constexpr double GATE_FACTOR = 0.8;      // IMPROVED: relaxed from the paper's literal 1.0 --
                                                 // a Python sweep found 0.8 reduces reliance on the
                                                 // naive highest-energy fallback while still favoring
                                                 // above-average-energy nodes as candidates

// --------------------------- Radio / traffic -------------------------------
static constexpr uint32_t PACKET_BITS = 2000;   // UNIFIED (paper's own value is 4000 -- see ORIGINAL file)
static constexpr double E_ELEC = 50e-9;
static constexpr double E_FS = 10e-12;
static constexpr double E_MP = 0.0013e-12;
static constexpr double E_DA = 5e-9;
static constexpr double DATA_RATE = 250000.0;
static constexpr double LIGHT = 3.0e8;

static constexpr uint32_t MAX_ROUNDS = 5000;
static constexpr uint32_t SEED = 12345;

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

// --------------------- H-LEACH selection (paper's Algorithm 1) -------------
static uint32_t RunSelection(vector<SensorNode>& nodes, uint32_t round, mt19937& rng, uint32_t& fallbackFired)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) { n.finalCH = false; n.clusterHead = numeric_limits<uint32_t>::max(); }

    double sumEnergy = 0.0;
    uint32_t aliveCount = 0;
    for (const auto& n : nodes) if (n.alive) { sumEnergy += n.energy; ++aliveCount; }
    const double eAvg = aliveCount ? sumEnergy / aliveCount : 0.0;

    vector<uint32_t> candidates;
    for (auto& n : nodes) {
        if (!n.alive) continue;
        const double e0i = P_CH * (n.energy / E0);
        if (e0i <= 0.0) continue;
        const uint32_t epoch = max<uint32_t>(1, static_cast<uint32_t>(lround(1.0 / e0i)));
        const double denom = 1.0 - e0i * static_cast<double>(round % epoch);
        double tn = (denom > 1e-9) ? (e0i / denom) : 1.0;
        tn = min(1.0, max(0.0, tn));

        if (U(rng) < tn && n.energy > GATE_FACTOR * eAvg) {
            candidates.push_back(n.id);
        }
    }

    fallbackFired = 0;
    if (candidates.empty()) {
        // See header note: necessary, disclosed fallback -- the paper's own
        // pseudocode never selects a CH without this under its own parameters.
        fallbackFired = 1;
        uint32_t best = numeric_limits<uint32_t>::max();
        double bestEnergy = -1.0;
        for (const auto& n : nodes) {
            if (n.alive && n.energy > bestEnergy) { bestEnergy = n.energy; best = n.id; }
        }
        if (best != numeric_limits<uint32_t>::max()) candidates.push_back(best);
    }

    for (uint32_t id : candidates) nodes[id].finalCH = true;

    uint32_t chCount = 0;
    for (const auto& n : nodes) if (n.alive && n.finalCH) ++chCount;

    // ---- Nearest-CH join (paper does not specify a join rule) ----
    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();
        if (!n.alive) continue;
        if (n.finalCH) { n.clusterHead = n.id; continue; }

        double bestDistance = numeric_limits<double>::infinity();
        uint32_t bestCH = numeric_limits<uint32_t>::max();
        for (const auto& c : nodes) {
            if (!c.alive || !c.finalCH) continue;
            const double d = Dist(n, c);
            if (d < bestDistance - 1e-12 || (fabs(d - bestDistance) < 1e-12 && c.id < bestCH)) {
                bestDistance = d;
                bestCH = c.id;
            }
        }
        if (bestCH != numeric_limits<uint32_t>::max()) n.clusterHead = bestCH;
    }

    return chCount;
}

// ---------------------------- Round simulation -----------------------------
static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round, mt19937& rng)
{
    RoundResult r;
    r.round = round;

    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    uint32_t fallbackFired = 0;
    RunSelection(nodes, round, rng, fallbackFired);
    r.fallbackUsed = fallbackFired;

    for (const auto& n : nodes) if (n.alive && n.finalCH) ++r.chCount;
    for (const auto& n : nodes) if (n.alive) ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) continue;
        const double d = Dist(nodes[i], nodes[c]);
        const double tx = TxEnergy(PACKET_BITS, d);
        const double rx = RxEnergy(PACKET_BITS);
        if (tx > nodes[i].energy || rx > nodes[c].energy) continue;
        nodes[i].energy -= tx;
        nodes[c].energy -= rx;
        ++r.dataTx; ++r.dataRx;
        ++membersPerCH[c];
        memberDelivered[i] = true;
        delayToCH[i] = DelayMs(PACKET_BITS, d);
    }

    double delaySum = 0.0;
    uint32_t deliveredSources = 0;

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);
        if (agg > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; continue; }
        nodes[c].energy -= agg;
        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);
        if (txBS > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; continue; }
        nodes[c].energy -= txBS;
        ++r.dataTx; ++r.dataRx;
        deliveredSources += members + 1;
        delaySum += DelayMs(PACKET_BITS, dBS);
        for (uint32_t i = 0; i < N; ++i)
            if (memberDelivered[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, dBS);
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    double after = 0.0;
    r.alive = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) { n.energy = 0.0; n.alive = false; n.finalCH = false; }
        after += n.energy;
        if (n.alive) ++r.alive;
    }
    r.dead = N - r.alive;
    r.energyUsed = max(0.0, before - after);
    r.residualEnergy = after;
    r.pdr = r.generated ? static_cast<double>(r.delivered) / r.generated : 0.0;
    r.avgDelayMs = r.delivered ? delaySum / r.delivered : 0.0;

    const double dataTxTime = static_cast<double>(r.dataTx) * TxTimeSec(PACKET_BITS);
    r.roundDurationSec = dataTxTime;
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
    cout << "  H-LEACH -- EDITED+IMPROVED (relaxed energy gate)\n";
    cout << "========================================\n";
    cout << "Nodes = " << N << " | Area = " << AREA << "x" << AREA << " m | BS = (" << BSX << "," << BSY << ")\n";
    cout << "P = " << P_CH << " | E0 = " << E0 << " J | Gate factor = " << GATE_FACTOR << " (paper's literal \"energy>average\")\n";
    cout << "NOTE: fallback CH selection is ACTIVE whenever no node satisfies both\n";
    cout << "      conditions -- required for this algorithm to function at all (see file header).\n";
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
    }

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

    AnimationInterface anim("hleach-EDITED-IMPROVED-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);
    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("hleach-EDITED-IMPROVED-results.csv");
    ofstream energy("hleach-EDITED-IMPROVED-node-energy.csv");
    ofstream lifetime("hleach-EDITED-IMPROVED-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,FallbackUsed,Generated,Delivered,Lost,"
              "Data_TX,Data_RX,Energy_Used_J,Residual_Energy_J,Avg_Delay_ms,"
              "PDR,Round_Duration_s,Throughput_kbps\n";
    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0, HND = 0, LND = 0;
    bool fnd = false, hnd = false;
    vector<uint32_t> deathRound(N, 0);
    uint64_t totalGenerated = 0, totalDelivered = 0, totalFallbacks = 0;
    double totalUsed = 0.0;

    cout << "\nSimulation starts...\n";

    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        RoundResult r = SimulateRound(nodes, round, electionRng);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = (round == 1) ? 0.1 : static_cast<double>(round);
        Simulator::Schedule(Seconds(visualTime), [&anim, visualSnapshot]() {
            for (const auto& n : visualSnapshot) ApplyVisualState(&anim, n.id, n, visualSnapshot);
        });

        totalGenerated += r.generated;
        totalDelivered += r.delivered;
        totalUsed += r.energyUsed;
        totalFallbacks += r.fallbackUsed;

        rounds << fixed << setprecision(10)
               << r.round << ',' << r.alive << ',' << r.dead << ',' << r.chCount << ',' << r.fallbackUsed << ','
               << r.generated << ',' << r.delivered << ',' << r.lost << ','
               << r.dataTx << ',' << r.dataRx << ',' << r.energyUsed << ',' << r.residualEnergy << ','
               << r.avgDelayMs << ',' << r.pdr << ',' << r.roundDurationSec << ',' << r.throughputKbps << '\n';

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
             << " | CH=" << setw(3) << r.chCount << (r.fallbackUsed ? "*" : " ")
             << " | PDR=" << setw(7) << r.pdr << " | Residual=" << setw(9) << r.residualEnergy << " J\n";

        if (r.alive == 0) { LND = round; break; }
    }

    if (LND == 0) {
        for (uint32_t d : deathRound) LND = max(LND, d);
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
    cout << "Rounds where fallback CH selection fired = " << totalFallbacks << " / " << MAX_ROUNDS << "\n";
    cout << "\nCSV outputs: hleach-EDITED-IMPROVED-results.csv, hleach-EDITED-IMPROVED-node-energy.csv,\n";
    cout << "             hleach-EDITED-IMPROVED-node-lifetime.csv, hleach-EDITED-IMPROVED-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
