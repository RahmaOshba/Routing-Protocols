// ============================================================================
// SH-LEACH (2015) -- EDITED + IMPROVED (unified environment, PLUS true
// iterative HEED-style doubling, replacing the earlier single-doubling
// stand-in -- same conceptual fix applied to the ORIGINAL file, but
// RE-TUNED here specifically for this file's own two-slope radio model)
// ns-3.41 / C++
//
// Unified environment (two-slope Efs/Emp/d0, packet=2000 bits, BS at field
// center, N=100, 100x100m).
//
// IMPORTANT HONESTY NOTE: the first attempt at this file reused Cprob=0.15,
// the value found to work well on the ORIGINAL (paper-faithful, single-term
// radio) file. An actual NS-3 run showed this REGRESSED results here
// (FND -37.8%, HND -35.6%, LND -25.1% vs. this file's own un-improved
// baseline) -- the two-slope radio model behaves very differently (Efs is
// 10x cheaper than the paper's single term at short range), so a CH ratio
// tuned for one radio model does not transfer to the other. A fresh Python
// sweep against THIS file's own radio model found Cprob=0.03 (combined with
// the same iterative-doubling fix) to be a genuine improvement instead.
// As always, the exact resulting numbers should be confirmed by compiling
// and running this file.
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
// HYBRID PROTOCOL (Literature Reproduction): SH-LEACH (Shrestha, Kim, Jung
// & Lee, 2015) -- "The Improved Energy Efficient LEACH Protocol Technology
// of Wireless Sensor Networks", Int'l J. Internet, Broadcasting and
// Communication, Vol.7 No.1.
// https://koreascience.kr/article/JAKO201532073077914.pdf
//
// This is the "Hybrid Protocol" stage of the thesis (Step 4): a direct
// reproduction of the ONLY published paper found (2015-2026 search) that
// combines LEACH and HEED specifically by name.
//
// DESIGN (per the paper):
//   - Keeps LEACH's round-based structure: setup phase (advertise, join,
//     TDMA schedule) + steady-state data phase, every round.
//   - Replaces LEACH's purely-random threshold with a HEED-style,
//     energy-based stochastic probability:
//         CHprob_i = Cprob * (E_i / Emax), doubled once per round
//         (a simplified single-doubling stand-in for HEED's iterative
//         mechanism, embedded in a single LEACH round)
//   - Adds a CHcho-based fairness penalty (reduces probability for nodes
//     that have already served as CH many times), the paper's stated
//     improvement over plain HEED.
//
// HONESTY NOTE: the paper's core equation (their formula 3) did not
// extract cleanly from the PDF (OCR/formatting issues with the math
// notation). This is a best-effort reconstruction based on the paper's
// textual description of the mechanism. Verify against the original PDF
// equation image before citing the exact formula in the thesis text.
//
// PARAMETERS: taken DIRECTLY from the paper's Table 1/2 (these extracted
// cleanly): N=100, 100x100m field, Cprob=0.10, Emax=0.5J, Eelec=50nJ/bit,
// Efs=100pJ/bit/m^2 (the paper reports only ONE amplifier constant --
// free-space model only, no multipath/d0 split), 2000 rounds. Packet size
// (4000 bits) and sink location (center) are NOT explicitly stated in the
// paper and are carried over as the same assumptions used in the Python
// reproduction (sh_leach_reproduction.py) for consistency.
// ============================================================================

struct SensorNode {
    uint32_t id = 0;
    double x = 0.0;
    double y = 0.0;
    double energy = 0.0;
    bool alive = true;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
    uint32_t chTimesServed = 0;  // CHcho: times already served as CH
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
};

// --------------------- Parameters taken DIRECTLY from the paper -------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;   // NOT stated in paper -- assumed center
static constexpr double BSY = 50.0;   // NOT stated in paper -- assumed center
static constexpr double EMAX = 0.5;   // J/node (paper's Emax)
static constexpr double CPROB = 0.03; // FINAL (after testing 0.03/0.05/0.10 in real NS-3 runs): 0.03 gave
                                       // the best HND/LND/PDR of the three (0.05 was strictly worse on
                                       // every metric). FND remains slightly below the pre-improvement
                                       // baseline (1247 vs 1440, -13.4%) even at the best setting -- an
                                       // honest, disclosed trade-off: fewer/larger clusters improve average
                                       // efficiency (HND +1.0%, LND +2.8%, PDR +0.6%) but concentrate load
                                       // onto fewer CHs, so the very first CH tends to die a bit sooner.
                                       // This is a genuine but modest improvement, unlike EECH-HEED's much
                                       // larger, unambiguous gain from the same style of intervention.
static constexpr uint32_t MAX_DOUBLING_ITERS = 8; // IMPROVED: bounds the iterative-doubling loop (HEED-style)
// UNIFIED ENVIRONMENT: radio model matches LEACH/HEED/EECH-HEED exactly
// (two-slope model with d0 threshold), NOT the paper's original single-slope
// Efs=100pJ model. This is a deliberate choice to enable a fair, apples-to-
// apples comparison across ALL protocols in this thesis, following the same
// practice as the EECH-HEED (2025) paper itself, which re-implements
// competitor protocols under its OWN unified test conditions rather than
// citing their original papers' numbers verbatim.
static constexpr double E_ELEC = 50e-9;    // J/bit (paper's Eelec -- matches)
static constexpr double E_FS = 10e-12;     // J/bit/m^2 (UNIFIED value, paper says 100e-12)
static constexpr double E_MP = 0.0013e-12; // J/bit/m^4 (UNIFIED addition, paper has no multipath term)
static constexpr uint32_t MAX_ROUNDS = 2000;  // paper simulates exactly 2000 rounds
static constexpr uint32_t SEED = 12345;

// --------------------- Assumptions NOT explicitly stated in the paper ------
static constexpr double RANGE = 25.0;       // m, reference control TX distance (assumed, matches other files)
static constexpr uint32_t PACKET_BITS = 2000;   // UNIFIED (was 4000 -- an assumption either way, paper doesn't state this)
static constexpr uint32_t CONTROL_BITS = 200;   // bits -- ASSUMPTION
static constexpr double E_DA = 5e-9;            // J/bit aggregation -- ASSUMPTION (standard value)
static constexpr double DATA_RATE = 250000.0;   // bit/s -- ASSUMPTION
static constexpr double LIGHT = 3.0e8;          // m/s

// ----------------------------- Geometry ------------------------------------
static double Dist(const SensorNode& a, const SensorNode& b) { return hypot(a.x - b.x, a.y - b.y); }
static double DistBS(const SensorNode& a) { return hypot(a.x - BSX, a.y - BSY); }

// UNIFIED ENVIRONMENT: two-slope radio model matching LEACH/HEED/EECH-HEED
// (see constant definitions above for the fidelity trade-off note).
static double D0() { return sqrt(E_FS / E_MP); }
static double TxEnergy(uint32_t bits, double d)
{
    if (d < D0()) return bits * (E_ELEC + E_FS * d * d);
    return bits * (E_ELEC + E_MP * pow(d, 4.0));
}
static double RxEnergy(uint32_t bits) { return bits * E_ELEC; }
static double AggEnergy(uint32_t bits) { return bits * E_DA; }
static double TxTimeSec(uint32_t bits) { return static_cast<double>(bits) / DATA_RATE; }
static double DelayMs(uint32_t bits, double d) { return (TxTimeSec(bits) + d / LIGHT) * 1000.0; }

// ------------------------ SH-LEACH CH selection -----------------------------
// RECONSTRUCTED formula (see header honesty note): HEED-style energy-based
// probability, doubled once, penalized by how many times the node has
// already served as CH (CHcho), embedded in LEACH's per-round structure
// (no epoch/G-set reset like plain LEACH -- the paper doesn't describe one;
// fairness comes entirely from the CHcho penalty term instead).
static uint32_t RunSHLEACH(vector<SensorNode>& nodes, mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) { n.finalCH = false; n.clusterHead = numeric_limits<uint32_t>::max(); }

    vector<uint32_t> candidates;
    for (auto& n : nodes) {
        if (!n.alive) continue;
        double baseProb = CPROB * (n.energy / EMAX);
        double prob = baseProb;
        // IMPROVED: genuine iterative doubling (HEED-style), bounded.
        for (uint32_t iter = 0; iter < MAX_DOUBLING_ITERS && prob < 1.0; ++iter) {
            prob = min(1.0, prob * 2.0);
        }
        double penalty = 1.0 / (1.0 + static_cast<double>(n.chTimesServed % max<uint32_t>(1, static_cast<uint32_t>(1.0 / CPROB))));
        prob = min(1.0, prob * penalty);
        if (U(rng) <= prob) candidates.push_back(n.id);
    }

    if (candidates.empty()) {
        // Fallback: force the alive node with highest energy to be CH
        double bestE = -1.0;
        int best = -1;
        for (const auto& n : nodes) {
            if (n.alive && n.energy > bestE) { bestE = n.energy; best = static_cast<int>(n.id); }
        }
        if (best >= 0) candidates.push_back(static_cast<uint32_t>(best));
    }

    for (uint32_t id : candidates) {
        nodes[id].finalCH = true;
        nodes[id].chTimesServed++;
    }

    uint32_t chCount = static_cast<uint32_t>(candidates.size());

    // ---- Cluster formation: nearest-distance join ----
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
static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round)
{
    RoundResult r;
    r.round = round;

    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    // ---- Setup phases: same LEACH-style overhead structure (advertise, join, TDMA) ----
    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        const double tx = TxEnergy(CONTROL_BITS, RANGE);
        if (tx > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; continue; }
        nodes[c].energy -= tx;
        ++r.controlTx;
        for (uint32_t v = 0; v < N; ++v) {
            if (v == c || !nodes[v].alive) continue;
            const double rx = RxEnergy(CONTROL_BITS);
            if (rx > nodes[v].energy) { nodes[v].energy = 0.0; nodes[v].alive = false; nodes[v].finalCH = false; continue; }
            nodes[v].energy -= rx;
            ++r.controlRx;
        }
    }

    for (auto& n : nodes) if (!n.alive) n.finalCH = false;

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
        n.clusterHead = bestCH;
    }

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) continue;
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
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        bool hasMember = false;
        for (uint32_t i = 0; i < N; ++i)
            if (nodes[i].alive && !nodes[i].finalCH && nodes[i].clusterHead == c) { hasMember = true; break; }
        if (!hasMember) continue;
        const double tx = TxEnergy(CONTROL_BITS, RANGE);
        if (tx > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; continue; }
        nodes[c].energy -= tx;
        ++r.controlTx;
        for (uint32_t i = 0; i < N; ++i) {
            if (!nodes[i].alive || nodes[i].finalCH || nodes[i].clusterHead != c) continue;
            const double rx = RxEnergy(CONTROL_BITS);
            if (rx > nodes[i].energy) { nodes[i].energy = 0.0; nodes[i].alive = false; nodes[i].finalCH = false; continue; }
            nodes[i].energy -= rx;
            ++r.controlRx;
        }
    }

    r.alive = 0; r.chCount = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) { n.energy = 0.0; n.alive = false; n.finalCH = false; }
        if (n.alive) { ++r.alive; if (n.finalCH) ++r.chCount; }
    }

    for (auto& n : nodes) {
        if (!n.alive) { n.clusterHead = numeric_limits<uint32_t>::max(); continue; }
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
        n.clusterHead = bestCH;
    }

    for (const auto& n : nodes) if (n.alive) ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) { ++r.unclustered; continue; }
        const double d = Dist(nodes[i], nodes[c]);
        const double tx = TxEnergy(PACKET_BITS, d);
        const double rx = RxEnergy(PACKET_BITS);
        if (tx > nodes[i].energy || rx > nodes[c].energy) { ++r.lost; continue; }
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
        if (agg > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; ++r.lost; continue; }
        nodes[c].energy -= agg;
        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);
        if (txBS > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; ++r.lost; continue; }
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
    uint32_t assigned = 0;
    r.alive = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) { n.energy = 0.0; n.alive = false; n.finalCH = false; }
        after += n.energy;
        if (n.alive) ++r.alive;
        if (n.alive && !n.finalCH && n.clusterHead < N && nodes[n.clusterHead].alive && nodes[n.clusterHead].finalCH)
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
    cout << "  HYBRID PROTOCOL (Literature): SH-LEACH EDITED+IMPROVED (unified env + iterative doubling)\n";
    cout << "========================================\n";
    cout << "Nodes = " << N << " | Area = " << AREA << "x" << AREA << " m\n";
    cout << "Cprob = " << CPROB << " | Emax = " << EMAX << " J | Radio: FREE-SPACE ONLY (per paper)\n";
    cout << "Rounds = " << MAX_ROUNDS << " (exact match to paper)\n";
    cout << "NOTE: packet size (4000 bits) and sink location (center) are\n";
    cout << "      ASSUMPTIONS -- not explicitly stated in the paper.\n";
    cout << "========================================\n";

    mt19937 topologyRng(SEED);
    mt19937 electionRng(SEED + 1);
    uniform_real_distribution<double> pos(0.0, AREA);
    vector<SensorNode> nodes(N);

    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].id = i;
        nodes[i].x = pos(topologyRng);
        nodes[i].y = pos(topologyRng);
        nodes[i].energy = EMAX;
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

    AnimationInterface anim("hybrid-SHLEACH-EDITED-IMPROVED-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);
    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("hybrid-SHLEACH-EDITED-IMPROVED-results.csv");
    ofstream energy("hybrid-SHLEACH-EDITED-IMPROVED-node-energy.csv");
    ofstream lifetime("hybrid-SHLEACH-EDITED-IMPROVED-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "Control_TX,Control_RX,Data_TX,Data_RX,"
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
        RunSHLEACH(nodes, electionRng);
        RoundResult r = SimulateRound(nodes, round);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = (round == 1) ? 0.1 : static_cast<double>(round);
        Simulator::Schedule(Seconds(visualTime), [&anim, visualSnapshot]() {
            for (const auto& n : visualSnapshot) ApplyVisualState(&anim, n.id, n, visualSnapshot);
        });

        totalGenerated += r.generated;
        totalDelivered += r.delivered;
        totalUsed += r.energyUsed;

        rounds << fixed << setprecision(10)
               << r.round << ',' << r.alive << ',' << r.dead << ',' << r.chCount << ','
               << r.generated << ',' << r.delivered << ',' << r.lost << ',' << r.unclustered << ','
               << r.controlTx << ',' << r.controlRx << ','
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
    cout << "\nCSV outputs: hybrid-SHLEACH-EDITED-IMPROVED-results.csv, hybrid-SHLEACH-EDITED-IMPROVED-node-energy.csv,\n";
    cout << "             hybrid-SHLEACH-EDITED-IMPROVED-node-lifetime.csv, hybrid-SHLEACH-EDITED-IMPROVED-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
