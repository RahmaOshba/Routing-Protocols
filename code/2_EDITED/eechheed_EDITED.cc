// ============================================================================
// EECH-HEED (2025) -- EDITED (unified environment for fair comparison)
// ns-3.41 / C++
//
// SAME ALGORITHM as hybrid_EECHHEED_ORIGINAL.cc (Eq. 4 HEED in Zone 1,
// Eq. 5 EECH with node degree in Zone 2, Eq. 6 dynamic threshold with the
// G set, alpha and beta, same-zone join, minimum-energy multi-hop for
// Zone-2 CHs with every relay paying Rx + Tx). ONLY the environment is
// changed so that EECH-HEED runs under the same conditions as LEACH, HEED,
// PEGASIS, SH-LEACH, H-LEACH and v1-v8:
//   - Deployment: 100 nodes uniform in the 100 x 100 m field, every node
//     0.5 J (total 50 J like every other protocol). The paper's scenario
//     gives EECH-HEED about 56 J (heterogeneous + advanced nodes), which
//     would not be a fair comparison. Zone 1 = nodes within 30 m of the BS.
//   - Packet 2000 bits (paper 4000), E_DA 5 nJ/bit (paper 50 nJ/bit).
//   - Eq. 7 threshold sensing OFF: every alive node reports every round,
//     exactly like all the other protocols. (With sensing ON, a protocol
//     simply sends fewer packets, so its lifetime is not comparable.)
//   - Same as all protocols: control overhead charged (advertisement to the
//     whole field, join, TDMA), members + 1 fusion, a node with no CH sends
//     directly to the BS, run until the last node dies.
// Radio model (two-slope, Eelec 50 nJ/bit, Efs 10 pJ, Emp 0.0013 pJ) and
// Cprob = 0.05 are the paper's and already match the unified environment.
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
    double eInit = 0.0;          // own initial energy (E_max,i / E_init,i)
    bool alive = true;
    bool finalCH = false;
    uint32_t clusterHead = numeric_limits<uint32_t>::max();
    uint32_t zone = 1;           // 1 = near BS (HEED), 2 = far (EECH)
    uint32_t lastCHRound = 0;    // 0 = never CH (G set)
    // sensing state (Eq. 7)
    double ht0 = 0.0;
    double phase = 0.0;
    double sensedPrev = 0.0;
    double sensedLast = 0.0;
    bool reportedOnce = false;
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

// ------------------------- Scenario switches --------------------------------
static constexpr bool PAPER_DEPLOYMENT = false;  // UNIFIED: uniform field, all nodes 0.5 J (paper: 30/70 zones + heterogeneous)
static constexpr bool ENABLE_SENSING = false;    // UNIFIED: every node reports every round (paper: Eq. 7 sensing)

// --------------------- Parameters from the paper (Table 5) ------------------
static constexpr uint32_t N = 100;
static constexpr uint32_t N_ZONE1 = 30;
static constexpr uint32_t N_ZONE2 = 70;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double ZONE1_RADIUS = 30.0;
static constexpr double E_ZONE1 = 0.5;
static constexpr double E_ZONE2_MIN = 0.3;
static constexpr double E_ZONE2_MAX = 0.6;
static constexpr double ADVANCED_FRACTION = 0.20;
static constexpr double E_ADV_MIN = 1.0;
static constexpr double E_ADV_MAX = 1.5;
static constexpr double E_UNIFIED = 0.5;         // used only when PAPER_DEPLOYMENT == false
static constexpr uint32_t PACKET_BITS = 2000;    // UNIFIED (paper: 4000)
static constexpr double E_DA = 5e-9;             // J/bit UNIFIED (paper Table 5: 50 nJ/bit)
static constexpr double CPROB = 0.05;            // Table 5
static constexpr double E_ELEC = 50e-9;
static constexpr double E_FS = 10e-12;
static constexpr double E_MP = 0.0013e-12;
// Eq. 7 sensing parameters (Table 5)
static constexpr double HT0_MIN = 20.0;
static constexpr double HT0_MAX = 35.0;
static constexpr double ST0_PCT = 3.0;
static constexpr double LAMBDA = 1.0;
static constexpr double MU = 0.5;
static constexpr double E0_SENSE = 1.0;

// --------------------- Documented assumptions -------------------------------
static constexpr double R_NEIGH = 30.0;          // m, neighbourhood for E_avg and node degree
static constexpr uint32_t CONTROL_BITS = 200;
static const double ADV_RANGE = AREA * std::sqrt(2.0);
static const double D_MAX_BS = std::sqrt(2.0) * AREA / 2.0; // max possible distance to the central BS
static constexpr double SOIL_MEAN = 27.5;        // C
static constexpr double SOIL_AMP = 7.5;          // C  -> 20..35 C daily swing
static constexpr double SOIL_PERIOD = 240.0;     // rounds per "day"
static constexpr double SOIL_NOISE = 1.0;        // C (sensor noise, see header)
static constexpr double DATA_RATE = 250000.0;
static constexpr double LIGHT = 3.0e8;

static constexpr uint32_t MAX_ROUNDS = 20000;    // run until the last node dies
static constexpr uint32_t SEED = 12345;

// ----------------------------- Geometry / radio -----------------------------
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

static bool Spend(SensorNode& n, double e)
{
    if (e > n.energy) { n.energy = 0.0; n.alive = false; n.finalCH = false; return false; }
    n.energy -= e;
    return true;
}

// ------------------------ EECH-HEED CH election (Eq. 4-6) -------------------
static double ZoneProbability(const vector<SensorNode>& nodes, const SensorNode& n, double dMaxDeg)
{
    if (n.zone == 1) {
        // Eq. 4: Cprob * E_res / E_avg(neighbourhood)
        double sum = 0.0; uint32_t cnt = 0;
        for (const auto& m : nodes)
            if (m.alive && m.zone == 1 && Dist(n, m) <= R_NEIGH) { sum += m.energy; ++cnt; }
        const double eAvg = cnt ? sum / cnt : n.energy;
        return eAvg > 0.0 ? CPROB * n.energy / eAvg : 0.0;
    }
    // Eq. 5: (E_i / E_max,i) * (D_i / D_max), D = node degree
    double deg = 0.0;
    for (const auto& m : nodes)
        if (m.alive && m.zone == 2 && m.id != n.id && Dist(n, m) <= R_NEIGH) deg += 1.0;
    const double degTerm = dMaxDeg > 0.0 ? deg / dMaxDeg : 1.0;
    return (n.energy / n.eInit) * degTerm;
}

static void RunEECHHEED(vector<SensorNode>& nodes, uint32_t round, mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);
    for (auto& n : nodes) { n.finalCH = false; n.clusterHead = numeric_limits<uint32_t>::max(); }

    double dMaxDeg = 0.0;
    for (const auto& n : nodes) {
        if (!n.alive || n.zone != 2) continue;
        double deg = 0.0;
        for (const auto& m : nodes)
            if (m.alive && m.zone == 2 && m.id != n.id && Dist(n, m) <= R_NEIGH) deg += 1.0;
        dMaxDeg = max(dMaxDeg, deg);
    }

    for (auto& n : nodes) {
        if (!n.alive) continue;
        const double p = min(1.0, ZoneProbability(nodes, n, dMaxDeg));
        if (p <= 0.0) continue;
        const uint32_t period = max<uint32_t>(1, static_cast<uint32_t>(llround(1.0 / p)));
        const bool inG = (n.lastCHRound == 0) || (round - n.lastCHRound >= period);
        if (!inG) continue;
        const double denom = 1.0 - p * static_cast<double>(round % period);
        double t = denom > 0.0 ? p / denom : 1.0;                  // Eq. 6, LEACH part
        const double alpha = n.energy / n.eInit;                    // Eq. 6, alpha_i
        const double beta = max(0.0, 1.0 - DistBS(n) / D_MAX_BS);   // Eq. 6, beta_i
        t = min(1.0, t) * alpha * beta;
        if (U(rng) < t) n.finalCH = true;
    }

    // Safeguard (not in the paper): every zone with alive nodes keeps one CH
    for (uint32_t z = 1; z <= 2; ++z) {
        bool hasCH = false, hasAlive = false;
        for (const auto& n : nodes) {
            if (!n.alive || n.zone != z) continue;
            hasAlive = true;
            if (n.finalCH) { hasCH = true; break; }
        }
        if (!hasAlive || hasCH) continue;
        double bestE = -1.0; int best = -1;
        for (const auto& n : nodes)
            if (n.alive && n.zone == z && n.energy > bestE) { bestE = n.energy; best = static_cast<int>(n.id); }
        if (best >= 0) nodes[best].finalCH = true;
    }

    for (auto& n : nodes) if (n.alive && n.finalCH) n.lastCHRound = round;
}

static void JoinSameZone(vector<SensorNode>& nodes)
{
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
                bestDistance = d; bestCH = c.id;
            }
        }
        n.clusterHead = bestCH;
    }
}

// ------------------------ Eq. 7 adaptive threshold sensing ------------------
static double SoilReading(const SensorNode& n, uint32_t round, mt19937& rng)
{
    normal_distribution<double> noise(0.0, SOIL_NOISE);
    return SOIL_MEAN + SOIL_AMP * sin(2.0 * M_PI * round / SOIL_PERIOD + n.phase) + noise(rng);
}

static bool DecideReport(SensorNode& n, uint32_t round, mt19937& rng)
{
    if (!ENABLE_SENSING) return true;
    const double s = SoilReading(n, round, rng);
    const double dsdt = (round > 1) ? s - n.sensedPrev : 0.0;
    n.sensedPrev = s;
    const double ht = n.ht0 + LAMBDA * dsdt;                                        // HT_t
    const double stPct = ST0_PCT + MU * (1.0 - min(1.0, n.energy / E0_SENSE));      // ST_t (%)
    const bool aboveHard = s > ht;
    const bool bigChange = !n.reportedOnce || fabs(s - n.sensedLast) > stPct / 100.0 * fabs(n.sensedLast);
    if (aboveHard && bigChange) { n.sensedLast = s; n.reportedOnce = true; return true; }
    return false;
}

// ---------------------------- Round simulation -----------------------------
static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round, mt19937& sensorRng)
{
    RoundResult r;
    r.round = round;
    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    // ---- Setup: CH advertisement (whole field) ----
    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        if (!Spend(nodes[c], TxEnergy(CONTROL_BITS, ADV_RANGE))) continue;
        ++r.controlTx;
        for (uint32_t v = 0; v < N; ++v) {
            if (v == c || !nodes[v].alive) continue;
            if (Spend(nodes[v], RxEnergy(CONTROL_BITS))) ++r.controlRx;
        }
    }
    JoinSameZone(nodes);
    // ---- Setup: join request ----
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive) continue;
        if (!Spend(nodes[i], TxEnergy(CONTROL_BITS, Dist(nodes[i], nodes[c])))) continue;
        ++r.controlTx;
        if (Spend(nodes[c], RxEnergy(CONTROL_BITS))) ++r.controlRx;
    }
    // ---- Setup: TDMA schedule to the farthest member ----
    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        double farthest = -1.0;
        for (uint32_t i = 0; i < N; ++i)
            if (nodes[i].alive && !nodes[i].finalCH && nodes[i].clusterHead == c)
                farthest = max(farthest, Dist(nodes[i], nodes[c]));
        if (farthest < 0.0) continue;
        if (!Spend(nodes[c], TxEnergy(CONTROL_BITS, farthest))) continue;
        ++r.controlTx;
        for (uint32_t i = 0; i < N; ++i)
            if (nodes[i].alive && !nodes[i].finalCH && nodes[i].clusterHead == c && Spend(nodes[i], RxEnergy(CONTROL_BITS)))
                ++r.controlRx;
    }
    for (auto& n : nodes) if (!n.alive) n.finalCH = false;
    JoinSameZone(nodes);   // re-join if a CH died during setup

    // ---- Sensing decision (Eq. 7) ----
    vector<bool> reports(N, false);
    for (auto& n : nodes) {
        if (!n.alive) continue;
        reports[n.id] = DecideReport(n, round, sensorRng);
        if (reports[n.id]) ++r.generated;
    }

    // ---- Steady state: member -> CH (same zone), or direct to BS ----
    vector<uint32_t> signals(N, 0);
    vector<double> memberDelaySum(N, 0.0);
    uint32_t deliveredSources = 0;
    double delaySum = 0.0;
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || !reports[i]) continue;
        if (nodes[i].finalCH) { ++signals[i]; continue; }
        const uint32_t c = nodes[i].clusterHead;
        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) {
            ++r.unclustered;
            const double dBS = DistBS(nodes[i]);
            if (!Spend(nodes[i], TxEnergy(PACKET_BITS, dBS))) continue;
            ++r.dataTx; ++r.dataRx; ++deliveredSources;
            delaySum += DelayMs(PACKET_BITS, dBS);
            continue;
        }
        const double d = Dist(nodes[i], nodes[c]);
        if (!Spend(nodes[i], TxEnergy(PACKET_BITS, d))) continue;
        ++r.dataTx;
        if (!Spend(nodes[c], RxEnergy(PACKET_BITS))) continue;
        ++r.dataRx;
        ++signals[c];
        memberDelaySum[c] += DelayMs(PACKET_BITS, d);
    }

    // ---- CH routing tree: minimum-energy path to the BS (Dijkstra) ----
    // Zone-1 CHs: direct to the BS. Zone-2 CHs: may relay through a
    // secondary CH (Zone 2) and/or a Zone-1 CH. Each relay pays Rx + Tx.
    vector<uint32_t> chs;
    for (const auto& n : nodes) if (n.alive && n.finalCH) chs.push_back(n.id);
    const uint32_t BS = N;
    vector<double> cost(N + 1, numeric_limits<double>::infinity());
    vector<uint32_t> nextHop(N, BS);
    vector<bool> done(N, false);
    for (uint32_t c : chs) cost[c] = TxEnergy(PACKET_BITS, DistBS(nodes[c]));
    for (size_t it = 0; it < chs.size(); ++it) {
        uint32_t u = BS; double best = numeric_limits<double>::infinity();
        for (uint32_t c : chs) if (!done[c] && cost[c] < best) { best = cost[c]; u = c; }
        if (u == BS) break;
        done[u] = true;
        for (uint32_t v : chs) {
            if (done[v] || nodes[v].zone != 2) continue;   // only Zone-2 CHs use multi-hop
            const double viaU = TxEnergy(PACKET_BITS, Dist(nodes[v], nodes[u])) + RxEnergy(PACKET_BITS) + cost[u];
            if (viaU < cost[v] - 1e-15) { cost[v] = viaU; nextHop[v] = u; }
        }
    }

    // ---- CH: fuse (members + own) and send along the path ----
    for (uint32_t c : chs) {
        if (!nodes[c].alive || !nodes[c].finalCH || signals[c] == 0) continue;
        if (!Spend(nodes[c], signals[c] * AggEnergy(PACKET_BITS))) continue;
        uint32_t cur = c;
        double pathDelay = 0.0;
        bool ok = true;
        for (uint32_t hops = 0; hops <= N; ++hops) {
            const uint32_t nh = nextHop[cur];
            const double d = (nh == BS) ? DistBS(nodes[cur]) : Dist(nodes[cur], nodes[nh]);
            if (!Spend(nodes[cur], TxEnergy(PACKET_BITS, d))) { ok = false; break; }
            ++r.dataTx;
            pathDelay += DelayMs(PACKET_BITS, d);
            if (nh == BS) { ++r.dataRx; break; }
            if (!nodes[nh].alive || !Spend(nodes[nh], RxEnergy(PACKET_BITS))) { ok = false; break; }
            ++r.dataRx;
            cur = nh;
        }
        if (!ok) continue;
        deliveredSources += signals[c];
        delaySum += memberDelaySum[c] + signals[c] * pathDelay;
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
    r.pdr = r.generated ? static_cast<double>(r.delivered) / r.generated : 0.0;
    r.avgDelayMs = r.delivered ? delaySum / r.delivered : 0.0;
    const double controlTime = static_cast<double>(r.controlTx) * TxTimeSec(CONTROL_BITS);
    const double dataTxTime = static_cast<double>(r.dataTx) * TxTimeSec(PACKET_BITS);
    r.roundDurationSec = controlTime + dataTxTime;
    r.throughputKbps = r.roundDurationSec > 0.0
        ? static_cast<double>(r.delivered) * PACKET_BITS / r.roundDurationSec / 1000.0 : 0.0;
    return r;
}

static void ApplyVisualState(AnimationInterface* anim, uint32_t nodeId, const SensorNode& n,
                             const vector<SensorNode>& snapshot)
{
    if (!n.alive) { anim->UpdateNodeColor(nodeId, 120, 120, 120); anim->UpdateNodeDescription(nodeId, ""); return; }
    if (n.finalCH) {
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
    cout << "  HYBRID PROTOCOL (Literature): EECH-HEED EDITED unified (Kaur, Kour & Singh, 2025)\n";
    cout << "========================================\n";

    mt19937 topologyRng(SEED);
    mt19937 electionRng(SEED + 1);
    mt19937 sensorRng(SEED + 2);
    uniform_real_distribution<double> angleDist(0.0, 2.0 * M_PI);
    uniform_real_distribution<double> unit(0.0, 1.0);
    uniform_real_distribution<double> posDist(0.0, AREA);
    uniform_real_distribution<double> z2EnergyDist(E_ZONE2_MIN, E_ZONE2_MAX);
    uniform_real_distribution<double> advEnergyDist(E_ADV_MIN, E_ADV_MAX);
    uniform_real_distribution<double> ht0Dist(HT0_MIN, HT0_MAX);
    uniform_real_distribution<double> phaseDist(0.0, 0.5);

    vector<SensorNode> nodes(N);
    if (PAPER_DEPLOYMENT) {
        // Zone 1: 30 nodes uniformly inside the 30 m circle around the BS
        for (uint32_t i = 0; i < N_ZONE1; ++i) {
            const double a = angleDist(topologyRng);
            const double rad = ZONE1_RADIUS * sqrt(unit(topologyRng));
            nodes[i].x = BSX + rad * cos(a);
            nodes[i].y = BSY + rad * sin(a);
            nodes[i].energy = E_ZONE1;
            nodes[i].zone = 1;
        }
        // Zone 2: 70 nodes in the rest of the field, 20% advanced
        vector<uint32_t> pool(N_ZONE2);
        for (uint32_t k = 0; k < N_ZONE2; ++k) pool[k] = k;
        shuffle(pool.begin(), pool.end(), topologyRng);
        const uint32_t nAdv = static_cast<uint32_t>(llround(ADVANCED_FRACTION * N_ZONE2));
        vector<bool> advanced(N_ZONE2, false);
        for (uint32_t k = 0; k < nAdv; ++k) advanced[pool[k]] = true;
        for (uint32_t k = 0; k < N_ZONE2; ++k) {
            const uint32_t i = N_ZONE1 + k;
            double px, py;
            do { px = posDist(topologyRng); py = posDist(topologyRng); }
            while (hypot(px - BSX, py - BSY) <= ZONE1_RADIUS);
            nodes[i].x = px; nodes[i].y = py;
            nodes[i].energy = advanced[k] ? advEnergyDist(topologyRng) : z2EnergyDist(topologyRng);
            nodes[i].zone = 2;
        }
    } else {
        // Unified deployment: 100 nodes uniform in the field, all E0 = 0.5 J;
        // the zone is decided by the distance to the BS (<= 30 m -> Zone 1).
        for (uint32_t i = 0; i < N; ++i) {
            nodes[i].x = posDist(topologyRng);
            nodes[i].y = posDist(topologyRng);
            nodes[i].energy = E_UNIFIED;
            nodes[i].zone = (DistBS(nodes[i]) <= ZONE1_RADIUS) ? 1 : 2;
        }
    }
    uint32_t z1 = 0; double eTotal = 0.0;
    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].id = i;
        nodes[i].eInit = nodes[i].energy;
        nodes[i].alive = true;
        nodes[i].ht0 = ht0Dist(topologyRng);
        nodes[i].phase = phaseDist(topologyRng);
        if (nodes[i].zone == 1) ++z1;
        eTotal += nodes[i].energy;
    }
    cout << "Zone1 nodes = " << z1 << ", Zone2 nodes = " << (N - z1)
         << ", total initial energy = " << fixed << setprecision(3) << eTotal << " J\n";
    cout << "Packet = " << PACKET_BITS << " bits, E_DA = " << E_DA * 1e9 << " nJ/bit, Cprob = " << CPROB
         << ", sensing = " << (ENABLE_SENSING ? "ON (Eq. 7)" : "OFF (every node reports every round)") << "\n";
    cout << "========================================\n";

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

    AnimationInterface anim("eechheed_EDITED-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);
    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("eechheed_EDITED-results.csv");
    ofstream energy("eechheed_EDITED-node-energy.csv");
    ofstream lifetime("eechheed_EDITED-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "Control_TX,Control_RX,Data_TX,Data_RX,Energy_Used_J,Residual_Energy_J,Avg_Cluster_Size,"
              "Avg_Delay_ms,PDR,Round_Duration_s,Throughput_kbps\n";
    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0, HND = 0, LND = 0;
    bool fnd = false, hnd = false;
    vector<uint32_t> deathRound(N, 0);
    uint64_t totalGenerated = 0, totalDelivered = 0;
    double totalUsed = 0.0, chSum = 0.0;
    uint32_t roundsRun = 0;

    cout << "\nSimulation starts...\n";
    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        RunEECHHEED(nodes, round, electionRng);
        RoundResult r = SimulateRound(nodes, round, sensorRng);
        ++roundsRun;
        chSum += r.chCount;

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
             << "Round " << setw(5) << round << " | Alive=" << setw(3) << r.alive
             << " | CH=" << setw(3) << r.chCount << " | PDR=" << setw(7) << r.pdr
             << " | Residual=" << setw(9) << r.residualEnergy << " J\n";

        if (r.alive == 0) { LND = round; break; }
    }
    // LND is only reported when the last node really died.

    for (uint32_t i = 0; i < N; ++i)
        lifetime << i << ',' << (deathRound[i] ? to_string(deathRound[i]) : "Not_Dead") << '\n';
    rounds.close(); energy.close(); lifetime.close();

    Simulator::Stop(Seconds(static_cast<double>(roundsRun) + 2.0));
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
    cout << "Packets generated = " << totalGenerated << ", delivered = " << totalDelivered << "\n";
    cout << "Overall PDR = " << overallPdr << "\n";
    cout << setprecision(2) << "Average CHs per round = " << (roundsRun ? chSum / roundsRun : 0.0) << "\n";
    cout << "\nCSV outputs: eechheed_EDITED-results.csv, -node-energy.csv, -node-lifetime.csv\n";
    cout << "========================================\n";
    return 0;
}
