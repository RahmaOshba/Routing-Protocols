// ============================================================================
// LEACH -- EDITED (unified environment for fair cross-protocol comparison)
// ns-3.41 / C++
//
// SAME ALGORITHM as leach_ORIGINAL.cc (threshold T(n), G-set/epoch, nearest-
// CH join, whole-field CH advertisement, TDMA to farthest member, fusion of
// members + own signal, CH-less nodes transmit directly) -- only the
// ENVIRONMENT is standardized to match HEED/PEGASIS/SH-LEACH/EECH-HEED:
// 100x100 m field, BS at the centre (50,50), two-slope Efs/Emp/d0 radio,
// packet = 2000 bits, and setup control messages ARE charged (every protocol
// in the unified environment pays its own control overhead).
// For the paper-faithful reproduction, see leach_ORIGINAL.cc.
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
static constexpr double AREA = 100.0;   // FIXED: paper's Figure 3 network spans -25 to 25 (50x50m), NOT 100x100m
static constexpr double BSX = 50.0;    // FIXED: paper states BS "100m from the closest sensor node"
#ifndef BS_Y
#define BS_Y 50.0
#endif
static constexpr double BSY = BS_Y;   // 50 = field centre; compile with -DBS_Y=-100 for the far-BS runs
                                        // field at y=-100 keeps the nearest node (~y=0) at ~100m,
                                        // matching the paper's own stated distance.
static constexpr double E0 = 0.5;       // J/node
static const double ADV_RANGE = AREA * std::sqrt(2.0); // m: CH advertisement reaches the whole field (paper Sec. 5.1)

// ------------------------------- LEACH --------------------------------------
static constexpr double P_CH = 0.05;
static constexpr uint32_t EPOCH = 20;   // 1 / P_CH

// --------------------------- Radio / traffic -------------------------------
// Optional security overhead (all 0 by default = the thesis results).
// Used for the "cost of hybrid cryptography" experiment (thesis proposal:
// symmetric inside the cluster, public-key only between the CH and the sink):
//   SEC_BITS        extra bits per frame (e.g. 104 = IEEE 802.15.4 security:
//                   5-byte auxiliary header + 8-byte MIC), data and control
//   SEC_NJ_PER_BIT  symmetric-cipher energy per bit, paid by the sender
//                   (encrypt) and by the receiver (decrypt)
//   SEC_SETUP_MJ    one-time public-key key-establishment energy per node at
//                   deployment, in mJ
//   SEC_AUTH_MJ     public-key energy paid by every newly elected CH (or chain
//                   leader) to authenticate to the sink and receive its
//                   credentials / session key, in mJ (hybrid scheme)
//   SEC_PK_TX_MJ    public-key operation per DATA packet, paid by the sender,
//   SEC_PK_RX_MJ    and by the receiving node, in mJ ("full public-key" mode:
//                   every packet encrypted with RSA/ECC; the sink is mains-powered)
#ifndef SEC_BITS
#define SEC_BITS 0
#endif
#ifndef SEC_NJ_PER_BIT
#define SEC_NJ_PER_BIT 0.0
#endif
#ifndef SEC_SETUP_MJ
#define SEC_SETUP_MJ 0.0
#endif
#ifndef SEC_AUTH_MJ
#define SEC_AUTH_MJ 0.0
#endif
#ifndef SEC_PK_TX_MJ
#define SEC_PK_TX_MJ 0.0
#endif
#ifndef SEC_PK_RX_MJ
#define SEC_PK_RX_MJ 0.0
#endif
//   SEC_PK_BS_MJ    public-key encryption (e.g. ECIES) of every data packet that
//                   goes straight to the sink, paid by the sender, in mJ
//                   ("asymmetric between CH and sink"; members still use AES)
#ifndef SEC_PK_BS_MJ
#define SEC_PK_BS_MJ 0.0
#endif
//   SEC_KEYDIST     1 = at every cluster set-up the sink sends each node the new
//                   cluster key, wrapped with the node's own AES key (one extra
//                   control frame received per node; the sink pays its own TX)
#ifndef SEC_KEYDIST
#define SEC_KEYDIST 0
#endif
static constexpr double E_SEC = SEC_NJ_PER_BIT * 1e-9;   // J/bit
static constexpr double E_AUTH = SEC_AUTH_MJ * 1e-3;     // J per CH election
static constexpr double E_PK_TX = SEC_PK_TX_MJ * 1e-3;   // J per data packet sent
static constexpr double E_PK_RX = SEC_PK_RX_MJ * 1e-3;   // J per data packet received
static constexpr double E_PK_BS = SEC_PK_BS_MJ * 1e-3;   // J per data packet sent to the sink
static constexpr uint32_t PACKET_BITS = 2000 + SEC_BITS;
static constexpr uint32_t CONTROL_BITS = 200 + SEC_BITS;
// PAPER Sec. 4: "these simulations do not account for the setup time to
// configure the dynamic clusters (nor ... any necessary routing start-up
// costs)". The paper-faithful reproduction therefore does NOT charge the
// setup control messages (advertisement, join, TDMA schedule). The unified
// environment (leach_EDITED_unified.cc) charges them for every protocol.
static constexpr bool COUNT_SETUP_ENERGY = true;   // UNIFIED: control overhead charged for every protocol
static constexpr double E_ELEC = 50e-9;       // J/bit
static constexpr double E_FS = 10e-12;        // J/bit/m^2 (UNIFIED two-slope)
static constexpr double E_MP = 0.0013e-12;    // J/bit/m^4
static double D0() { return std::sqrt(E_FS / E_MP); }
//      // J/bit/m^2 (ORIGINAL: paper's single term "epsilon_amp",
                                               // no separate free-space/multipath split -- Table 1, Eq. 1)
static constexpr double E_DA = 5e-9;          // J/bit
static constexpr double DATA_RATE = 250000.0; // bit/s
static constexpr double LIGHT = 3.0e8;        // m/s

static constexpr uint32_t MAX_ROUNDS = 20000; // run until the last node dies
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

// ORIGINAL: LEACH paper's Equation 1 -- single amplifier term, no d0 threshold
static double TxEnergy(uint32_t bits, double d)
{
    const double pk = (bits >= PACKET_BITS) ? E_PK_TX : 0.0;   // full public-key mode only
    if (d <= 0.0)
        return pk + bits * (E_ELEC + E_SEC);

    if (d < D0())
        return pk + bits * (E_ELEC + E_SEC + E_FS * d * d);
    return pk + bits * (E_ELEC + E_SEC + E_MP * pow(d, 4.0));
}

static double RxEnergy(uint32_t bits)
{
    return ((bits >= PACKET_BITS) ? E_PK_RX : 0.0) + bits * (E_ELEC + E_SEC);
}

// Setup control messages (see COUNT_SETUP_ENERGY)
static double CtrlTx(double d) { return COUNT_SETUP_ENERGY ? TxEnergy(CONTROL_BITS, d) : 0.0; }
static double CtrlRx() { return COUNT_SETUP_ENERGY ? RxEnergy(CONTROL_BITS) : 0.0; }

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
    // The paper does not say what happens if no node passes T(n) in a round.
    // Gap-filling safeguard (kept because it reproduces the paper's Table 2
    // best): pick one eligible node at random so the round still has a CH.
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

    // Hybrid security (0 by default): every CH of this round authenticates to the sink.
    if (E_AUTH > 0.0)
        for (auto& n : nodes)
            if (n.alive && n.finalCH) n.energy = max(0.0, n.energy - E_AUTH);
    // Key distribution (0 by default): every node receives the new cluster key from the sink.
    if (SEC_KEYDIST)
        for (auto& n : nodes)
            if (n.alive) n.energy = max(0.0, n.energy - RxEnergy(CONTROL_BITS));

    // ---------------- SETUP: ADVERTISEMENT + JOIN + TDMA ----------------
    // Phase 1: CH advertisement.
    for (uint32_t c = 0; c < N; ++c) {
        if (!nodes[c].alive || !nodes[c].finalCH)
            continue;

        const double tx = CtrlTx(ADV_RANGE);
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

            const double rx = CtrlRx();
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
        const double tx = CtrlTx(d);
        const double rx = CtrlRx();

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
        double farthest = 0.0;
        for (uint32_t i = 0; i < N; ++i) {
            if (nodes[i].alive && !nodes[i].finalCH && nodes[i].clusterHead == c) {
                hasMember = true;
                farthest = max(farthest, Dist(nodes[i], nodes[c]));
            }
        }

        if (!hasMember)
            continue;

        const double tx = CtrlTx(farthest);
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

            const double rx = CtrlRx();
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
    uint32_t directDelivered = 0;
    double directDelaySum = 0.0;

    // ---------------- MEMBER -> CH ----------------
    for (uint32_t i = 0; i < N; ++i) {
        if (!nodes[i].alive || nodes[i].finalCH)
            continue;

        const uint32_t c = nodes[i].clusterHead;

        if (c >= N || !nodes[c].alive || !nodes[c].finalCH) {
            // PAPER: a node with no CH (e.g. a zero-CH round) sends its data
            // directly to the BS (direct transmission).
            ++r.unclustered;
            const double dBS = DistBS(nodes[i]);
            const double txBS = TxEnergy(PACKET_BITS, dBS) + E_PK_BS;
            if (txBS > nodes[i].energy) {
                nodes[i].energy = 0.0;
                nodes[i].alive = false;
                continue;
            }
            nodes[i].energy -= txBS;
            ++r.dataTx;
            ++r.dataRx;
            ++directDelivered;
            directDelaySum += DelayMs(PACKET_BITS, dBS);
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
        const double agg = static_cast<double>(members + 1) * AggEnergy(PACKET_BITS); // PAPER: fuse members' + own signal

        if (agg > nodes[c].energy) {
            nodes[c].energy = 0.0;
            nodes[c].alive = false;
            nodes[c].finalCH = false;
            ++r.lost;
            continue;
        }

        nodes[c].energy -= agg;

        const double dBS = DistBS(nodes[c]);
        const double txBS = TxEnergy(PACKET_BITS, dBS) + E_PK_BS;

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

    deliveredSources += directDelivered;
    delaySum += directDelaySum;
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
    cout << "CH advertisement range = " << ADV_RANGE << " m (whole field)\n";
    cout << "Packet = " << PACKET_BITS << " bits\n";
    cout << "Radio d0 = " << D0() << " m (two-slope)\n";
    cout << "Metrics = analytical baseline (not PHY/MAC packet-level)\n";
    cout << "Connectivity = no hard range cutoff; distance affects energy\n";
    cout << "LEACH G-set = reset at the start of every 20-round epoch\n";
    cout << "Setup control energy = " << (COUNT_SETUP_ENERGY ? "charged" : "not charged (as in the paper's simulation)") << "\n";
    cout << "Zero-CH round safeguard = one random eligible node (paper does not define this case)\n";
    cout << "Visualization = leach_EDITED-clustering.xml (NetAnim)\n";
    cout << "========================================\n";

    mt19937 topologyRng(SEED);
    mt19937 electionRng(SEED + 1);
    uniform_real_distribution<double> pos(0.0, AREA);

    vector<SensorNode> nodes(N);

    for (uint32_t i = 0; i < N; ++i) {
        nodes[i].id = i;
        nodes[i].x = pos(topologyRng);
        nodes[i].y = pos(topologyRng);
        nodes[i].energy = E0 - SEC_SETUP_MJ * 1e-3;   // key setup at deployment (0 by default)
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

    AnimationInterface anim("leach_EDITED-clustering.xml");
    anim.SetMobilityPollInterval(Seconds(1.0));
    anim.UpdateNodeDescription(N, "SINK");
    anim.UpdateNodeColor(N, 255, 215, 0);

    for (const auto& n : nodes)
        ApplyVisualState(&anim, n.id, n, nodes);

    ofstream rounds("leach_EDITED-results.csv");
    ofstream energy("leach_EDITED-node-energy.csv");
    ofstream lifetime("leach_EDITED-node-lifetime.csv");

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

    // LND is only reported when the last node really died (otherwise "Not reached").

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
    cout << "  leach_EDITED-results.csv\n";
    cout << "  leach_EDITED-node-energy.csv\n";
    cout << "  leach_EDITED-node-lifetime.csv\n";
    cout << "  leach_EDITED-clustering.xml\n";
    cout << "========================================\n";

    return 0;
}
