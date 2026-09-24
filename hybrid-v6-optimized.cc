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
// HYBRID PROTOCOL v8 (file name: hybrid-v6-optimized.cc): v5b (Backup Failover + Chain/Cluster Repair +
//                     Energy-Aware Repair) + 5 lifetime/PDR improvements
// ns-3.41 / C++   --  SETUP_INTERVAL = 5
//
// Everything from v5b is kept. v6 adds:
//
//   I1. EPOCH-EXHAUSTION FIX (bug fix): in v5b, once every alive node had
//       already been CH in the current epoch, the selection had NO eligible
//       candidate and whole intervals ran with ZERO CHs (e.g. rounds 196-200
//       with all 100 nodes alive, PDR = 0). A new epoch now starts early.
//   I2. PROACTIVE CH HANDOVER: before the data phase, a CH that cannot afford
//       this round's CH workload hands its role to its highest-energy member
//       (1 control packet, charged). v5b only reacted AFTER the CH died, by
//       which time that round's member packets were already lost.
//   I3. ORPHAN RE-JOIN: members whose CH died with no usable backup re-join
//       the nearest surviving CH (known from setup advertisements, no new
//       messages) instead of staying unclustered until the next setup.
//   I4. DIRECT-TO-BS: a node that is no farther from the BS than from its CH
//       (or that has no CH at all) sends straight to the BS. Its own TX cost
//       is the same or lower, and the CH saves RX + aggregation energy.
//   I5. ENERGY-GATED CH ELECTION: nodes below the network's average residual
//       energy may not volunteer as CH, so weak nodes are not overloaded.
//   +   RELATIVE LOW-ENERGY THRESHOLD for Energy-Aware Repair: 5% of the live
//       network average instead of 5% of E0, so Backup Failover keeps working
//       late in the network's life instead of rejecting every backup.
//
// Each improvement can be switched off for an ablation study by compiling
// with -DI1=0 ... -DI5=0.
// No WiFi/packet layer (reliable, analytical-only design).
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
    uint32_t degree = 0;
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
    bool wasSetupRound = false;
    uint32_t backupPromotions = 0;   // NEW: successful backup->CH promotions this round
    uint32_t backupRejected = 0;    // NEW: CH deaths where no usable backup was available
    uint32_t proactiveHandovers = 0; // v6: CH role handed over before the CH could die mid-round
    uint32_t directToBS = 0;         // v6: packets a node sent straight to the BS
};

// ----------------------------- Network -------------------------------------
static constexpr uint32_t N = 100;
static constexpr double AREA = 100.0;
static constexpr double BSX = 50.0;
static constexpr double BSY = 50.0;
static constexpr double E0 = 0.5;
static constexpr double RANGE = 25.0;

// ------------------------------- Protocol params ----------------------------
static constexpr double P_CH = 0.05;          // same target ratio as LEACH
static constexpr uint32_t EPOCH = 20;         // LEACH-style fairness window (1/P_CH)
static constexpr uint32_t SETUP_INTERVAL = 5; // requested variant: interval=5, combined
                                                // with Backup CH Failover + Chain/Cluster Repair below.

// --------------------------- Radio / traffic -------------------------------
static constexpr uint32_t PACKET_BITS = 2000;
static constexpr uint32_t CONTROL_BITS = 200;
static constexpr double E_ELEC = 50e-9;
static constexpr double E_FS = 10e-12;
static constexpr double E_MP = 0.0013e-12;
static constexpr double E_DA = 5e-9;
static constexpr double DATA_RATE = 250000.0;
static constexpr double LIGHT = 3.0e8;

static constexpr uint32_t MAX_ROUNDS = 5000;  // RAISED from 3000 -- SETUP_INTERVAL=15 may extend LND further
static constexpr uint32_t SEED = 12345;

// ------------------------- v6 improvements (ablation toggles) ---------------
// Each can be disabled with -DI1=0 etc. at compile time to measure its effect.
#ifndef I1
#define I1 1
#endif
#ifndef I2
#define I2 1
#endif
#ifndef I3
#define I3 1
#endif
#ifndef I4
#define I4 1
#endif
#ifndef I5
#define I5 1
#endif
static constexpr bool FIX_EPOCH_EXHAUSTION = I1; // never leave the network with zero CHs
static constexpr bool PROACTIVE_HANDOVER = I2;   // hand CH role over BEFORE the CH dies mid-round
static constexpr bool ORPHAN_REJOIN = I3;        // orphaned members re-join nearest alive CH
static constexpr bool DIRECT_TO_BS = I4;         // node closer to BS than to its CH sends directly
static constexpr bool ENERGY_GATED_CH = I5;      // only above-average-energy nodes may become CH

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

static double Threshold(uint32_t setupIndex)
{
    // Same LEACH-style rotation-guarantee formula, applied per SETUP round
    // index (not per data round) since selection only happens at setups.
    const uint32_t r = setupIndex % EPOCH;
    const double denom = 1.0 - P_CH * static_cast<double>(r);
    return denom > 0.0 ? P_CH / denom : 1.0;
}

// ---- NEW: Backup CH bookkeeping (reset every setup round) ----
static vector<int32_t> g_backupOf(N, -1);   // g_backupOf[chId] = backup node id for that CH, this interval
static vector<bool> g_failedOver(N, false); // whether chId's backup has already been promoted this interval

// ---- IMPROVEMENT 2: Energy-Aware Repair ----
// Below this fraction of the network's CURRENT average residual energy, a node
// is judged too close to death for a repair transmission to have any real
// chance of succeeding, so it is left silent (saving its last energy) instead
// of being forced into a doomed send.
// v6 change: v5b compared against 5% of E0 (a fixed 0.025 J). Late in the
// network's life EVERY node is below 0.025 J, so every backup was rejected and
// failover never fired. Comparing against the live average ("weak relative to
// its neighbours right now") keeps the mechanism working until the end.
static constexpr double LOW_ENERGY_FRAC = 0.05;
static double g_avgEnergy = E0;     // refreshed at the start of every round
static bool LowEnergy(double energy) { return energy < LOW_ENERGY_FRAC * g_avgEnergy; }

// ---- NEW: Chain/Cluster Repair -- promote backup, reconnect orphaned members, same round ----
static void TryFailover(vector<SensorNode>& nodes, uint32_t deadCH, RoundResult& r)
{
    if (g_failedOver[deadCH]) return;
    g_failedOver[deadCH] = true;
    const int32_t b = g_backupOf[deadCH];
    if (b < 0 || !nodes[static_cast<uint32_t>(b)].alive || nodes[static_cast<uint32_t>(b)].finalCH
        || LowEnergy(nodes[static_cast<uint32_t>(b)].energy)) { // NEW: reject an already-dying backup
        ++r.backupRejected;
        return;
    }
    nodes[static_cast<uint32_t>(b)].finalCH = true;
    nodes[static_cast<uint32_t>(b)].clusterHead = static_cast<uint32_t>(b);
    for (auto& n : nodes)
        if (n.alive && !n.finalCH && n.clusterHead == deadCH && !LowEnergy(n.energy)) // NEW: only reconnect members that can plausibly benefit
            n.clusterHead = static_cast<uint32_t>(b);   // repair: reconnect to the newly promoted CH
    ++r.backupPromotions;
}

// ---- v6: shared helpers ----
static uint32_t NearestAliveCH(const vector<SensorNode>& nodes, const SensorNode& n)
{
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
    return bestCH;
}

// Energy a CH will spend this round: receive + aggregate every member, then one packet to BS.
static double ExpectedCHCost(const vector<SensorNode>& nodes, uint32_t ch, uint32_t members)
{
    return members * (RxEnergy(PACKET_BITS) + AggEnergy(PACKET_BITS)) + TxEnergy(PACKET_BITS, DistBS(nodes[ch]));
}

// ---- v6 IMPROVEMENT: Proactive CH handover ----
// v5 only reacts AFTER a CH has died, by which point the members' packets of
// that round are already lost. Here the CH checks, before the data phase,
// whether its residual energy can cover this round's CH workload. If not, it
// hands the role to the highest-energy member it currently has (members'
// residual energy is piggy-backed on their data packets, so the CH knows it)
// and announces the change with ONE control packet, which is charged below.
static bool ProactiveHandover(vector<SensorNode>& nodes, uint32_t ch, RoundResult& r)
{
    int32_t b = -1;
    double bestE = nodes[ch].energy;   // only hand over to someone strictly better off
    uint32_t members = 0;
    for (const auto& m : nodes) {
        if (!m.alive || m.finalCH || m.clusterHead != ch) continue;
        ++members;
        if (m.energy > bestE && !LowEnergy(m.energy)) { bestE = m.energy; b = static_cast<int32_t>(m.id); }
    }
    if (b < 0) return false;
    const uint32_t nb = static_cast<uint32_t>(b);
    const double announce = TxEnergy(CONTROL_BITS, RANGE);
    if (announce + ExpectedCHCost(nodes, nb, members) > nodes[nb].energy) return false;
    nodes[nb].energy -= announce;
    ++r.controlTx;
    nodes[nb].finalCH = true;
    nodes[nb].clusterHead = nb;
    nodes[ch].finalCH = false;
    for (auto& n : nodes) {
        if (!n.alive || n.finalCH || n.clusterHead != ch) continue;
        n.clusterHead = nb;
        if (n.id == ch) continue;
        const double rx = RxEnergy(CONTROL_BITS);
        if (rx <= n.energy) { n.energy -= rx; ++r.controlRx; }
    }
    nodes[ch].clusterHead = nb;        // old CH simply becomes a member
    ++r.proactiveHandovers;
    return true;
}

// --------------------- SINGLE-PASS selection (no iteration) ----------------
static uint32_t RunSelection(vector<SensorNode>& nodes, const vector<vector<uint32_t>>& nb,
                              uint32_t setupIndex, mt19937& rng)
{
    uniform_real_distribution<double> U(0.0, 1.0);

    for (auto& n : nodes) { n.finalCH = false; n.clusterHead = numeric_limits<uint32_t>::max(); }
    fill(g_backupOf.begin(), g_backupOf.end(), -1);       // NEW: reset backups every setup
    fill(g_failedOver.begin(), g_failedOver.end(), false); // NEW: reset failover flags every setup

    if (setupIndex % EPOCH == 0)
        for (auto& n : nodes) n.selectedThisEpoch = false;

    // v6 FIX: v5 could run whole intervals with ZERO CHs once every alive node
    // had already served in the current epoch (e.g. rounds 196-200 with all
    // 100 nodes alive). Start a fresh epoch early whenever that happens.
    if (FIX_EPOCH_EXHAUSTION) {
        bool anyEligible = false;
        for (const auto& n : nodes) if (n.alive && !n.selectedThisEpoch) { anyEligible = true; break; }
        if (!anyEligible) for (auto& n : nodes) n.selectedThisEpoch = false;
    }

    // v6: energy gate -- a node below the network's average residual energy
    // is not allowed to volunteer as CH (it would be the first to die).
    double avgEnergy = 0.0;
    uint32_t aliveCount = 0;
    for (const auto& n : nodes) if (n.alive) { avgEnergy += n.energy; ++aliveCount; }
    avgEnergy = aliveCount ? avgEnergy / aliveCount : 0.0;

    uint32_t maxDegree = 1;
    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].degree = nodes[i].alive ? static_cast<uint32_t>(nb[i].size()) : 0;
        maxDegree = max(maxDegree, nodes[i].degree);
    }

    const double t = Threshold(setupIndex);
    vector<uint32_t> candidates;

    for (auto& n : nodes) {
        if (!n.alive || n.selectedThisEpoch) continue;
        if (ENERGY_GATED_CH && n.energy < avgEnergy) continue;
        const double degreeNorm = static_cast<double>(n.degree) / static_cast<double>(maxDegree);
        const double score = (n.energy / E0) * (1.0 + degreeNorm);  // HEED energy x connectivity, ONE shot
        const double prob = min(1.0, t * score);
        if (U(rng) <= prob) candidates.push_back(n.id);
    }

    if (candidates.empty()) {
        vector<uint32_t> eligible;
        for (const auto& n : nodes) if (n.alive && !n.selectedThisEpoch) eligible.push_back(n.id);
        if (!eligible.empty()) {
            uint32_t best = eligible.front();
            double bestScore = -1.0;
            for (uint32_t id : eligible) {
                double degreeNorm = static_cast<double>(nodes[id].degree) / static_cast<double>(maxDegree);
                double score = (nodes[id].energy / E0) * (1.0 + degreeNorm);
                if (score > bestScore) { bestScore = score; best = id; }
            }
            candidates.push_back(best);
        }
    }

    for (uint32_t id : candidates) { nodes[id].finalCH = true; nodes[id].selectedThisEpoch = true; }

    uint32_t chCount = 0;
    for (const auto& n : nodes) if (n.alive && n.finalCH) ++chCount;

    // ---- LEACH-style nearest-distance join ----
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

    // ---- NEW: Designate each CH's backup = highest-energy ALIVE non-CH member of its own cluster ----
    for (const auto& c : nodes) {
        if (!c.alive || !c.finalCH) continue;
        int32_t bestId = -1;
        double bestE = -1.0;
        for (const auto& m : nodes) {
            if (!m.alive || m.finalCH || m.clusterHead != c.id) continue;
            if (m.energy > bestE) { bestE = m.energy; bestId = static_cast<int32_t>(m.id); }
        }
        g_backupOf[c.id] = bestId;
    }

    return chCount;
}

// ---------------------------- Round simulation -----------------------------
static RoundResult SimulateRound(vector<SensorNode>& nodes, uint32_t round, bool isSetupRound)
{
    RoundResult r;
    r.round = round;
    r.wasSetupRound = isSetupRound;

    const double before = [&]() { double s = 0.0; for (const auto& n : nodes) s += n.energy; return s; }();

    {   // v6: live average residual energy used by LowEnergy()
        double sum = 0.0;
        uint32_t alive = 0;
        for (const auto& n : nodes) if (n.alive) { sum += n.energy; ++alive; }
        g_avgEnergy = alive ? sum / alive : E0;
    }

    // ---- Control overhead ONLY on setup rounds (the key saving) ----
    if (isSetupRound) {
        for (uint32_t c = 0; c < N; ++c) {
            if (!nodes[c].alive || !nodes[c].finalCH) continue;
            const double tx = TxEnergy(CONTROL_BITS, RANGE);
            if (tx > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; TryFailover(nodes, c, r); continue; }
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
            n.clusterHead = NearestAliveCH(nodes, n);
        }
    }

    // ---- Every round: handle CHs that died mid-interval (between setups) ----
    for (auto& n : nodes) {
        if (n.alive && n.clusterHead < N && !nodes[n.clusterHead].alive)
            n.clusterHead = numeric_limits<uint32_t>::max();
        // v6: orphans re-join the nearest surviving CH. Every node already
        // heard all CH advertisements at setup, so this needs no new message.
        if (ORPHAN_REJOIN && n.alive && !n.finalCH && n.clusterHead >= N)
            n.clusterHead = NearestAliveCH(nodes, n);
    }

    if (PROACTIVE_HANDOVER) {
        vector<uint32_t> members(N, 0);
        for (const auto& n : nodes)
            if (n.alive && !n.finalCH && n.clusterHead < N) ++members[n.clusterHead];
        for (uint32_t c = 0; c < N; ++c) {
            if (!nodes[c].alive || !nodes[c].finalCH) continue;
            if (nodes[c].energy < ExpectedCHCost(nodes, c, members[c]))
                ProactiveHandover(nodes, c, r);
        }
    }

    for (const auto& n : nodes) if (n.alive && n.finalCH) ++r.chCount;
    for (const auto& n : nodes) if (n.alive) ++r.generated;

    vector<uint32_t> membersPerCH(N, 0);
    vector<bool> memberDelivered(N, false);
    vector<double> delayToCH(N, 0.0);

    uint32_t directDelivered = 0;
    double directDelaySum = 0.0;

    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH) continue;
        const uint32_t c = nodes[i].clusterHead;
        const bool hasCH = c < N && nodes[c].alive && nodes[c].finalCH;
        // v6: if the BS is no farther than the CH (or there is no CH at all),
        // send straight to the BS: same/lower TX cost for the node, and the
        // CH is spared the RX + aggregation energy for this packet.
        if (DIRECT_TO_BS && (!hasCH || DistBS(nodes[i]) <= Dist(nodes[i], nodes[c]))) {
            const double dBS = DistBS(nodes[i]);
            const double tx = TxEnergy(PACKET_BITS, dBS);
            if (tx > nodes[i].energy) { ++r.lost; continue; }
            nodes[i].energy -= tx;
            ++r.dataTx; ++r.dataRx; ++r.directToBS;
            ++directDelivered;
            directDelaySum += DelayMs(PACKET_BITS, dBS);
            continue;
        }
        if (!hasCH) { ++r.unclustered; continue; }
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

    double delaySum = directDelaySum;
    uint32_t deliveredSources = directDelivered;

    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH) continue;
        const uint32_t members = membersPerCH[c];
        const double agg = static_cast<double>(members) * AggEnergy(PACKET_BITS);
        if (agg > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; TryFailover(nodes, c, r); ++r.lost; continue; }
        nodes[c].energy -= agg;
        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS);
        if (txBS > nodes[c].energy) { nodes[c].energy = 0.0; nodes[c].alive = false; nodes[c].finalCH = false; TryFailover(nodes, c, r); ++r.lost; continue; }
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
    cout << "  HYBRID v8: v5b + epoch fix + proactive handover + orphan re-join + direct-to-BS + energy-gated CH\n";
    cout << "========================================\n";
    cout << "Setup interval = " << SETUP_INTERVAL << " rounds (control overhead paid once per interval)\n";
    cout << "Selection = single-pass energy x connectivity score (no iteration)\n";
    cout << "Join = LEACH-style nearest distance\n";
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

    AnimationInterface anim("hybrid-v6-optimized-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);
    for (const auto& n : nodes) ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("hybrid-v6-optimized-results.csv");
    ofstream energy("hybrid-v6-optimized-node-energy.csv");
    ofstream lifetime("hybrid-v6-optimized-node-lifetime.csv");
    if (!rounds || !energy || !lifetime) NS_FATAL_ERROR("Cannot create CSV output files.");

    rounds << "Round,Alive,Dead,CH_Count,Generated,Delivered,Lost,Unclustered,"
              "Was_Setup_Round,Control_TX,Control_RX,Data_TX,Data_RX,"
              "Energy_Used_J,Residual_Energy_J,Avg_Cluster_Size,Avg_Delay_ms,"
              "PDR,Round_Duration_s,Throughput_kbps,Backup_Promotions,Backup_Rejected,"
              "Proactive_Handovers,Direct_To_BS\n";
    energy << "Round,Node,Energy_J,Alive,Is_CH,ClusterHead\n";
    lifetime << "Node,Death_Round\n";

    uint32_t FND = 0, HND = 0, LND = 0;
    bool fnd = false, hnd = false;
    vector<uint32_t> deathRound(N, 0);
    uint64_t totalGenerated = 0, totalDelivered = 0;
    double totalUsed = 0.0;
    uint32_t setupIndex = 0;
    uint64_t totalPromotions = 0, totalRejected = 0; // NEW
    uint64_t totalHandovers = 0, totalDirect = 0;    // v6

    cout << "\nSimulation starts...\n";

    for (uint32_t round = 1; round <= MAX_ROUNDS; ++round) {
        const bool isSetupRound = ((round - 1) % SETUP_INTERVAL == 0);

        if (isSetupRound) {
            auto nb = BuildNeighbors(nodes);
            RunSelection(nodes, nb, setupIndex, electionRng);
            ++setupIndex;
        }

        RoundResult r = SimulateRound(nodes, round, isSetupRound);

        const vector<SensorNode> visualSnapshot = nodes;
        const double visualTime = (round == 1) ? 0.1 : static_cast<double>(round);
        Simulator::Schedule(Seconds(visualTime), [&anim, visualSnapshot]() {
            for (const auto& n : visualSnapshot) ApplyVisualState(&anim, n.id, n, visualSnapshot);
        });

        totalGenerated += r.generated;
        totalDelivered += r.delivered;
        totalUsed += r.energyUsed;
        totalPromotions += r.backupPromotions;   // NEW
        totalRejected += r.backupRejected;       // NEW
        totalHandovers += r.proactiveHandovers;  // v6
        totalDirect += r.directToBS;             // v6

        rounds << fixed << setprecision(10)
               << r.round << ',' << r.alive << ',' << r.dead << ',' << r.chCount << ','
               << r.generated << ',' << r.delivered << ',' << r.lost << ',' << r.unclustered << ','
               << (r.wasSetupRound ? 1 : 0) << ',' << r.controlTx << ',' << r.controlRx << ','
               << r.dataTx << ',' << r.dataRx << ',' << r.energyUsed << ',' << r.residualEnergy << ','
               << r.avgClusterSize << ',' << r.avgDelayMs << ',' << r.pdr << ','
               << r.roundDurationSec << ',' << r.throughputKbps << ',' << r.backupPromotions << ',' << r.backupRejected << ','
               << r.proactiveHandovers << ',' << r.directToBS << '\n';

        for (const auto& n : nodes) {
            energy << round << ',' << n.id << ',' << setprecision(10) << n.energy << ','
                   << (n.alive ? 1 : 0) << ',' << (n.alive && n.finalCH ? 1 : 0) << ','
                   << (n.clusterHead < N ? to_string(n.clusterHead) : "-1") << '\n';
            if (!n.alive && deathRound[n.id] == 0) deathRound[n.id] = round;
        }

        if (!fnd && r.dead >= 1) { FND = round; fnd = true; }
        if (!hnd && r.alive <= N / 2) { HND = round; hnd = true; }

        cout << fixed << setprecision(4)
             << "Round " << setw(4) << round << (r.wasSetupRound ? "*" : " ")
             << " | Alive=" << setw(3) << r.alive << " | CH=" << setw(3) << r.chCount
             << " | PDR=" << setw(7) << r.pdr << " | Residual=" << setw(9) << r.residualEnergy << " J\n";

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
    cout << "Total Delivered Packets = " << totalDelivered << "\n";
    cout << "Backup Promotions = " << totalPromotions << " successful / " << totalRejected << " rejected\n"; // NEW
    cout << "Proactive Handovers = " << totalHandovers << "\n";
    cout << "Direct-to-BS Packets = " << totalDirect << "\n";
    cout << "\nCSV outputs: hybrid-v6-optimized-results.csv, hybrid-v6-optimized-node-energy.csv,\n";
    cout << "             hybrid-v6-optimized-node-lifetime.csv, hybrid-v6-optimized-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
