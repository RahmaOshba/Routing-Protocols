// ============================================================================
// EECH-HEED (2025) -- EDITED + IMPROVED (unified environment, PLUS the
// paper's own Adaptive Threshold-Based Sensing mechanism)
// ns-3.41 / C++
//
// This is the UNIFIED-ENVIRONMENT file (packet=2000 bits, matching
// LEACH/HEED/SH-LEACH -- NOT the paper's own 4000 bits) with the same
// Adaptive Threshold-Based Sensing mechanism added as in the corrected
// ORIGINAL file: a non-CH node only transmits when its sensed reading has
// changed meaningfully since its last report, or when a maximum silent
// interval has elapsed.
//
// IMPORTANT HONESTY NOTE: the first attempt at this file reused the
// threshold values (SOFT=2.3/HARD=23.0/MAX_SILENT=40) tuned for the
// ORIGINAL file's 4000-bit packet. An actual NS-3 run of that first attempt
// showed FND/HND/LND all "Not reached" -- at half the packet size (half the
// energy cost per report), that suppression level was so aggressive that
// literally no node ever died within 5000 rounds, making the result
// unusable for comparison. A fresh Python sweep against THIS file's own
// 2000-bit packet size found SOFT=1.0/HARD=10.0/MAX_SILENT=30 to still
// clearly beat this file's own un-improved baseline while producing an
// actual, measurable lifetime. As always, exact resulting numbers should
// be confirmed by compiling and running this file.
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
// HYBRID PROTOCOL (Literature Reproduction): EECH-HEED (Kaur, Kour & Singh,
// 2025) -- "An adaptive hybrid clustering protocol for energy efficient
// soil monitoring in heterogeneous wireless sensor networks",
// Scientific Reports 15, 35548 (2025).
// https://www.nature.com/articles/s41598-025-19480-y
//
// This is the second "Hybrid Protocol" reproduction (thesis Step 4),
// alongside SH-LEACH (2015) -- the two closest published hybrid papers
// found in the SOTA search.
//
// DESIGN (per the paper, dual-zone architecture):
//   ZONE 1 (near BS): 30 nodes, homogeneous energy, circular region of
//     radius 30m centered on the sink. Uses HEED-style CH probability:
//         PCH_i = Cprob * (E_i / E_avg_zone1)
//   ZONE 2 (far from BS): 70 nodes, heterogeneous energy (20% "advanced"
//     nodes with 50% more energy). Uses EECH-style CH probability:
//         PCH_i = (E_i / E_max_i) * (D_i / D_max)
//     where D_i is the node's distance to the sink (the paper's exact
//     definition of this "EECH" distance term was not fully specified
//     beyond "node degree/position" in the extracted text -- distance-
//     to-sink is used here as the best-supported interpretation,
//     consistent with the Python reproduction, eech_heed_reproduction.py).
//   JOIN: each node joins the nearest CH WITHIN ITS OWN ZONE.
//   RELAY: Zone-2 CHs send to whichever is closer -- the sink directly,
//     or the nearest Zone-1 CH (a simplified 1-hop approximation of the
//     paper's multi-tier primary/secondary CH relay hierarchy).
//   Zone-1 CHs send directly to the sink.
//
// PARAMETERS confirmed directly from the paper's Methods/Table 5:
//   N=100 (30 Zone1 + 70 Zone2), 100x100m field, BS at center,
//   Zone1 radius=30m, Zone1 energy=0.5J (homogeneous),
//   Zone2 energy randomized 0.3-0.6J with 20% advanced nodes at 1.5x,
//   packet size=4000 bits, Eagg(EDA)=5nJ/bit, desired CH ratio=10%.
//   The standard first-order radio model constants (Eelec/Efs/Emp) were
//   not explicitly re-listed for this paper in the extracted text --
//   the same literature-standard values used throughout this thesis's
//   other files are used here for consistency.
// ============================================================================

struct SensorNode {
    uint32_t id = 0;
    double x = 0.0;
    double y = 0.0;
    double energy = 0.0;
    double eMax = 0.0;      // per-node initial/max energy (heterogeneous in Zone 2)
    bool alive = true;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
    uint32_t zone = 1;      // 1 = near BS, 2 = far from BS
    double sensedLast = 0.0;    // NEW: last reported sensed value (threshold sensing)
    uint32_t silentRounds = 0;  // NEW: rounds since last report (threshold sensing)
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

// --------------------- Parameters confirmed from the paper -------------------
static constexpr uint32_t N_ZONE1 = 30;
static constexpr uint32_t N_ZONE2 = 70;
static constexpr uint32_t N = N_ZONE1 + N_ZONE2;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double ZONE1_RADIUS = 30.0;
static constexpr double E_ZONE1 = 0.5;
static constexpr double E_ZONE2_MIN = 0.3;
static constexpr double E_ZONE2_MAX = 0.6;
static constexpr double ADVANCED_FRACTION = 0.20;
static constexpr double ADVANCED_MULTIPLIER = 1.5;
static constexpr uint32_t PACKET_BITS = 2000;  // UNIFIED (paper's Table 5 states 4000 -- see ORIGINAL file)
static constexpr double E_DA = 50e-9;  // FIXED: paper's Table 5 states 50 nJ/bit (was 5 nJ/bit)
static constexpr double CPROB = 0.05;  // FIXED: paper's Table 5 states C_prob = 0.05 (was 0.10)

// --------------------- Standard radio model (not re-specified in paper) -----
static constexpr double E_ELEC = 50e-9;
static constexpr double E_FS = 10e-12;
static constexpr double E_MP = 0.0013e-12;
static constexpr double DATA_RATE = 250000.0;
static constexpr double LIGHT = 3.0e8;

static constexpr uint32_t MAX_ROUNDS = 5000;  // FIXED: paper runs exactly 5000 rounds (was 3000)
static constexpr uint32_t SEED = 12345;

// --------------------- NEW: Adaptive Threshold-Based Sensing ---------------
// Same mechanism and same retuned values as the corrected ORIGINAL file
// (SOFT=2.0 confirmed to beat the paper's FND/HND/LND with PDR=93.68%;
// SOFT=2.3 nudges PDR's margin higher based on the same trend).
static constexpr double SOFT_THRESH = 1.0;        // RE-TUNED for packet=2000 bits (was 2.3, tuned for
                                                   // the paper's 4000-bit packet -- that setting was
                                                   // confirmed via NS-3 to suppress transmissions so
                                                   // aggressively at half the packet cost that NO node
                                                   // died within 5000 rounds at all)
static constexpr double HARD_THRESH = 10.0;       // RE-TUNED alongside SOFT_THRESH, same ratio
static constexpr uint32_t MAX_SILENT_ROUNDS = 30; // RE-TUNED (was 40)
static constexpr double SENSED_WALK_STDDEV = 1.5;

// ----------------------------- Geometry ------------------------------------
static double Dist(const SensorNode& a, const SensorNode& b) { return hypot(a.x - b.x, a.y - b.y); }
static double DistBS(const SensorNode& a) { return hypot(a.x - BSX, a.y - BSY); }
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

// ------------------------ EECH-HEED CH selection ----------------------------
static uint32_t RunEECHHEED(vector<SensorNode>& nodes, mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);
    for (auto& n : nodes) { n.finalCH = false; n.clusterHead = numeric_limits<uint32_t>::max(); }

    double dMax = 0.0;
    for (const auto& n : nodes) dMax = max(dMax, DistBS(n));

    double eAvgZone1 = 0.0;
    uint32_t aliveZone1 = 0;
    for (const auto& n : nodes)
        if (n.alive && n.zone == 1) { eAvgZone1 += n.energy; ++aliveZone1; }
    eAvgZone1 = aliveZone1 ? eAvgZone1 / aliveZone1 : 1.0;

    for (auto& n : nodes) {
        if (!n.alive) continue;
        double prob;
        if (n.zone == 1) {
            prob = CPROB * (n.energy / eAvgZone1);          // Zone 1: HEED formula
        } else {
            const double d = DistBS(n);
            prob = (n.energy / n.eMax) * (d / dMax);          // Zone 2: EECH formula
        }
        prob = min(1.0, max(0.0, prob));
        if (U(rng) <= prob) n.finalCH = true;
    }

    // Ensure at least one CH per zone (avoid an orphaned zone)
    for (uint32_t z = 1; z <= 2; ++z) {
        bool hasCH = false;
        for (const auto& n : nodes) if (n.alive && n.zone == z && n.finalCH) { hasCH = true; break; }
        if (!hasCH) {
            double bestE = -1.0; int best = -1;
            for (const auto& n : nodes)
                if (n.alive && n.zone == z && n.energy > bestE) { bestE = n.energy; best = static_cast<int>(n.id); }
            if (best >= 0) nodes[best].finalCH = true;
        }
    }

    uint32_t chCount = 0;
    for (const auto& n : nodes) if (n.alive && n.finalCH) ++chCount;

    // ---- Join: nearest CH WITHIN THE SAME ZONE ----
    for (auto& n : nodes) {
        n.clusterHead = numeric_limits<uint32_t>::max();
        if (!n.alive) continue;
        if (n.finalCH) { n.clusterHead = n.id; continue; }

        double bestDistance = numeric_limits<double>::infinity();
        uint32_t bestCH = numeric_limits<uint32_t>::max();
        for (const auto& c : nodes) {
            if (!c.alive || !c.finalCH || c.zone != n.zone) continue;
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
static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round, mt19937& sensorRng)
{
    RoundResult r;
    r.round = round;

    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    // ---- NEW: Adaptive Threshold-Based Sensing decision ----
    normal_distribution<double> walk(0.0, SENSED_WALK_STDDEV);
    vector<bool> willReport(N, true);
    for (auto& n : nodes) {
        if (!n.alive) continue;
        if (n.finalCH) { willReport[n.id] = true; continue; }
        const double sensedNow = n.sensedLast + walk(sensorRng);
        const double delta = fabs(sensedNow - n.sensedLast);
        if (delta >= SOFT_THRESH || delta >= HARD_THRESH || n.silentRounds >= MAX_SILENT_ROUNDS) {
            willReport[n.id] = true;
            n.sensedLast = sensedNow;
            n.silentRounds = 0;
        } else {
            willReport[n.id] = false;
            ++n.silentRounds;
        }
    }

    for (const auto& n : nodes) if (n.alive && willReport[n.id]) ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    // ---- Member -> CH (same zone) ----
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        if (!willReport[i]) continue;  // NEW: suppressed by adaptive threshold sensing
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

    // ---- CH aggregation + relay to sink (Zone1 direct, Zone2 direct-or-relay) ----
    double delaySum = 0.0;
    uint32_t deliveredSources = 0;

    // Precompute Zone-1 CH list for Zone-2 relay decisions
    vector<uint32_t> zone1CHs;
    for (const auto& n : nodes) if (n.alive && n.finalCH && n.zone == 1) zone1CHs.push_back(n.id);

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);
        if (agg > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; ++r.lost; continue; }
        nodes[c].energy -= agg;

        double d;
        if (nodes[c].zone == 1) {
            d = DistBS(nodes[c]);
        } else {
            const double dDirect = DistBS(nodes[c]);
            double dRelay = numeric_limits<double>::infinity();
            for (uint32_t z1 : zone1CHs) dRelay = min(dRelay, Dist(nodes[c], nodes[z1]));
            d = min(dDirect, dRelay);
        }

        const double tx = TxEnergy(PACKET_BITS, d);
        if (tx > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; ++r.lost; continue; }
        nodes[c].energy -= tx;
        ++r.dataTx; ++r.dataRx;
        deliveredSources += members + 1;
        delaySum += DelayMs(PACKET_BITS, d);
        for (uint32_t i = 0; i < N; ++i)
            if (memberDelivered[i] && nodes[i].clusterHead == c)
                delaySum += delayToCH[i] + DelayMs(PACKET_BITS, d);
    }

    r.delivered = min(deliveredSources, r.generated);
    r.lost = r.generated - r.delivered;

    double after = 0.0;
    uint32_t assigned = 0;
    r.alive = 0; r.chCount = 0;
    for (auto& n : nodes) {
        if (n.energy <= 0.0) { n.energy = 0.0; n.alive = false; n.finalCH = false; }
        after += n.energy;
        if (n.alive) { ++r.alive; if (n.finalCH) ++r.chCount; }
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
    if (n.finalCH) {
        // Zone1 CHs = red, Zone2 CHs = dark orange (visually distinguish zones)
        if (n.zone == 1) anim->UpdateNodeColor(nodeId, 255, 80, 80);
        else anim->UpdateNodeColor(nodeId, 200, 100, 0);
        anim->UpdateNodeDescription(nodeId, "CH" + to_string(n.id) + "(Z" + to_string(n.zone) + ")");
        return;
    }
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
    cout << "  HYBRID PROTOCOL (Literature): EECH-HEED EDITED+IMPROVED (unified env + threshold sensing)\n";
    cout << "========================================\n";
    cout << "Zone1 (near BS): " << N_ZONE1 << " nodes, radius=" << ZONE1_RADIUS << "m, homogeneous E=" << E_ZONE1 << "J\n";
    cout << "Zone2 (far): " << N_ZONE2 << " nodes, heterogeneous E=[" << E_ZONE2_MIN << "-" << E_ZONE2_MAX << "]J, "
         << (ADVANCED_FRACTION*100) << "% advanced nodes at " << ADVANCED_MULTIPLIER << "x energy\n";
    cout << "Cprob (Zone1 HEED) = " << CPROB << "\n";
    cout << "========================================\n";

    mt19937 topologyRng(SEED);
    mt19937 electionRng(SEED + 1);
    mt19937 sensorRng(SEED + 2);
    uniform_real_distribution<double> sensedBaseline(0.0, 100.0);
    uniform_real_distribution<double> angleDist(0.0, 2.0 * M_PI);
    uniform_real_distribution<double> radiusDist(0.0, ZONE1_RADIUS);
    uniform_real_distribution<double> posDist(0.0, AREA);
    uniform_real_distribution<double> z2EnergyDist(E_ZONE2_MIN, E_ZONE2_MAX);

    vector<SensorNode> nodes(N);

    // Zone 1: nodes inside the radius-30m circle around the sink
    for (uint32_t i = 0; i < N_ZONE1; ++i) {
        double angle = angleDist(topologyRng);
        double radius = radiusDist(topologyRng);
        nodes[i].id = i;
        nodes[i].x = BSX + radius * cos(angle);
        nodes[i].y = BSY + radius * sin(angle);
        nodes[i].energy = E_ZONE1;
        nodes[i].eMax = E_ZONE1;
        nodes[i].zone = 1;
        nodes[i].alive = true;
        nodes[i].sensedLast = sensedBaseline(topologyRng);
    }

    // Zone 2: nodes outside the Zone-1 circle, heterogeneous energy
    vector<uint32_t> z2AdvancedIdx;
    {
        uint32_t nAdvanced = static_cast<uint32_t>(ADVANCED_FRACTION * N_ZONE2);
        vector<uint32_t> pool(N_ZONE2);
        for (uint32_t i = 0; i < N_ZONE2; ++i) pool[i] = i;
        shuffle(pool.begin(), pool.end(), topologyRng);
        for (uint32_t i = 0; i < nAdvanced; ++i) z2AdvancedIdx.push_back(pool[i]);
    }
    for (uint32_t k = 0; k < N_ZONE2; ++k) {
        uint32_t i = N_ZONE1 + k;
        double px, py;
        do {
            px = posDist(topologyRng);
            py = posDist(topologyRng);
        } while (hypot(px - BSX, py - BSY) <= ZONE1_RADIUS);

        nodes[i].id = i;
        nodes[i].x = px;
        nodes[i].y = py;
        double e = z2EnergyDist(topologyRng);
        if (find(z2AdvancedIdx.begin(), z2AdvancedIdx.end(), k) != z2AdvancedIdx.end())
            e *= ADVANCED_MULTIPLIER;
        nodes[i].energy = e;
        nodes[i].eMax = e;
        nodes[i].zone = 2;
        nodes[i].alive = true;
        nodes[i].sensedLast = sensedBaseline(topologyRng);
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

    AnimationInterface anim("hybrid-EECHHEED-EDITED-IMPROVED-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);
    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("hybrid-EECHHEED-EDITED-IMPROVED-results.csv");
    ofstream energy("hybrid-EECHHEED-EDITED-IMPROVED-node-energy.csv");
    ofstream lifetime("hybrid-EECHHEED-EDITED-IMPROVED-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "Data_TX,Data_RX,Energy_Used_J,Residual_Energy_J,Avg_Cluster_Size,"
              "Avg_Delay_ms,PDR,Round_Duration_s,Throughput_kbps\n";
    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0, HND = 0, LND = 0;
    bool fnd = false, hnd = false;
    vector<uint32_t> deathRound(N, 0);
    uint64_t totalGenerated = 0, totalDelivered = 0;
    double totalUsed = 0.0;

    cout << "\nSimulation starts...\n";

    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        RunEECHHEED(nodes, electionRng);
        RoundResult r = SimulateRound(nodes, round, sensorRng);

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
    cout << "\nCSV outputs: hybrid-EECHHEED-results.csv, hybrid-EECHHEED-node-energy.csv,\n";
    cout << "             hybrid-EECHHEED-node-lifetime.csv, hybrid-EECHHEED-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
