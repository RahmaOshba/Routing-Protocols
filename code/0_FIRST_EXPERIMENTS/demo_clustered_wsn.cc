// ============================================================================
// DEMO: a small clustered WSN with REAL IEEE 802.15.4 packets (ns-3.41)
//
// What you see in NetAnim (open demo-clustered-wsn.xml, press Play):
//   - 12 sensors in 3 clusters + 1 sink (gold, top of the field).
//   - Every ROUND (10 s):
//       1. SETUP  : in every cluster the strongest node that has not been CH
//                   yet in this epoch becomes Cluster Head (red, bigger).
//       2. MEMBERS: each member sends its reading to its CH in its own TDMA
//                   slot (one at a time, so every packet is visible).
//       3. CH     : the CH fuses all readings into ONE packet and sends it to
//                   the sink.
//   - The CH role rotates as energy is spent (the CH transmits more).
//   - Stats tab -> Node Counters: remaining energy, packets sent / received.
//   - Packets tab: one row per packet (time, from, to) with its 802.15.4
//     headers (packet metadata is enabled).
//
// Terminal: every packet is printed (member -> CH, CH -> sink, ACK result).
// Wireshark: one .pcap file per node, demo-clustered-wsn-<node>-<dev>.pcap,
//   captured in promiscuous mode (a node records every frame it hears)
//   (turn off with --pcap=0). Open it to see the MAC header, the short
//   addresses, the 40-byte payload and the ACK frames.
//
// Real MAC/PHY: LR-WPAN (802.15.4, 250 kb/s, CSMA/CA, ACKs) installed with
// LrWpanHelper (shared channel, log-distance path loss), energy model from the radio state (TX / RX / idle current).
//
// Run:   ./ns3 run "scratch/demo_clustered_wsn --rounds=6"
// Output: demo-clustered-wsn.xml (NetAnim), demo-clustered-wsn-*.pcap
//         (Wireshark) and a packet log + summary in the terminal.
// ============================================================================
#include "ns3/core-module.h"
#include "ns3/energy-module.h"
#include "ns3/lr-wpan-module.h"
#include "ns3/mobility-module.h"
#include "ns3/netanim-module.h"

#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <vector>

using namespace ns3;

// ------------------------------ parameters ---------------------------------
static const uint32_t N_SENSORS = 12;
static const uint32_t N_CLUSTERS = 3;
static const uint32_t SINK = N_SENSORS;          // node id of the sink
static const uint32_t PACKET_SIZE = 40;          // bytes of payload
static const double ROUND_TIME = 10.0;           // seconds per round
static const double SLOT_TIME = 0.5;             // TDMA slot (slow on purpose: easy to watch)
static const double INITIAL_ENERGY = 20.0;       // J per sensor
static const double SUPPLY_VOLTAGE = 3.3;        // V
static const double TX_CURRENT = 0.017;          // A
static const double RX_CURRENT = 0.019;          // A
static const double IDLE_CURRENT = 0.001;        // A

// ------------------------------ state --------------------------------------
// ns-3 objects live in main(); the callbacks reach them through these pointers
// (global ns-3 containers would be destroyed after the simulator -> crash at exit)
static std::vector<Ptr<LrWpanNetDevice>>* g_dev = nullptr;
static std::vector<Ptr<SimpleDeviceEnergyModel>>* g_energyModel = nullptr;
static EnergySourceContainer* g_sources = nullptr;
static std::vector<uint32_t> g_clusterOf;        // sensor -> cluster
static std::vector<uint32_t> g_ch(N_CLUSTERS, 0); // cluster -> current CH
static std::vector<uint32_t> g_sent;             // packets sent per node
static std::vector<uint32_t> g_recv;             // packets received per node (data only)
static std::vector<uint32_t> g_readingsAtCH;     // readings collected by each CH this round
static std::vector<bool> g_servedThisEpoch;      // LEACH rule: CH at most once per epoch
static std::map<uint32_t, uint32_t> g_inFlight;  // CH -> readings inside its fused packet
static uint32_t g_readingsGenerated = 0;
static uint32_t g_readingsDelivered = 0;
static uint32_t g_round = 0;
static AnimationInterface* g_anim = nullptr;
static uint32_t g_cntEnergy = 0, g_cntSent = 0, g_cntRecv = 0;

static const uint8_t CLUSTER_COLOR[N_CLUSTERS][3] = {{60, 140, 255}, {40, 190, 110}, {170, 90, 230}};

static std::vector<Mac16Address> g_addr;        // node id -> short address

static Mac16Address
AddrOf(uint32_t id)
{
    return g_addr[id];
}

static std::string
Name(uint32_t id)
{
    if (id == SINK)
        return "SINK";
    return "S" + std::to_string(id);
}

static std::string
Stamp()
{
    std::ostringstream o;
    o << std::fixed << std::setprecision(2) << Simulator::Now().GetSeconds() << "s  ";
    return o.str();
}

static double
Remaining(uint32_t id)
{
    return g_sources->Get(id)->GetRemainingEnergy();
}

// ------------------------------ NetAnim look -------------------------------
static void
Paint()
{
    if (!g_anim)
        return;
    for (uint32_t i = 0; i < N_SENSORS; ++i)
    {
        const uint32_t c = g_clusterOf[i];
        const bool isCH = (g_ch[c] == i);
        std::ostringstream label;
        label << (isCH ? "CH" : "S") << i << " (" << std::fixed << std::setprecision(1)
              << Remaining(i) << " J)";
        if (isCH)
        {
            g_anim->UpdateNodeColor(i, 220, 30, 30);
            g_anim->UpdateNodeSize(i, 4.0, 4.0);
        }
        else
        {
            g_anim->UpdateNodeColor(i, CLUSTER_COLOR[c][0], CLUSTER_COLOR[c][1], CLUSTER_COLOR[c][2]);
            g_anim->UpdateNodeSize(i, 2.5, 2.5);
        }
        g_anim->UpdateNodeDescription(i, label.str());
        g_anim->UpdateNodeCounter(g_cntEnergy, i, Remaining(i));
        g_anim->UpdateNodeCounter(g_cntSent, i, g_sent[i]);
        g_anim->UpdateNodeCounter(g_cntRecv, i, g_recv[i]);
    }
    g_anim->UpdateNodeCounter(g_cntRecv, SINK, g_recv[SINK]);
    g_anim->UpdateNodeDescription(SINK, "SINK | readings: " + std::to_string(g_readingsDelivered));
}

// ------------------------------ energy from radio state --------------------
static void
PhyStateChange(uint32_t id, Time, LrWpanPhyEnumeration, LrWpanPhyEnumeration newState)
{
    if (!g_energyModel || id >= g_energyModel->size())
        return;
    double current = IDLE_CURRENT;
    if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_TX_ON ||
        newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_BUSY_TX)
        current = TX_CURRENT;
    else if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_RX_ON ||
             newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_BUSY_RX)
        current = RX_CURRENT;
    else if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_TRX_OFF)
        current = 0.0;
    (*g_energyModel)[id]->SetCurrentA(current);
}

// ------------------------------ send / receive ------------------------------
static void
Send(uint32_t from, uint32_t to, uint8_t handle)
{
    McpsDataRequestParams params;
    params.m_srcAddrMode = SHORT_ADDR;
    params.m_dstAddrMode = SHORT_ADDR;
    params.m_dstPanId = 0;
    params.m_dstAddr = AddrOf(to);
    params.m_msduHandle = handle;
    params.m_txOptions = TX_OPTION_ACK;
    g_sent[from]++;
    (*g_dev)[from]->GetMac()->McpsDataRequest(params, Create<Packet>(PACKET_SIZE));
}

// A data packet arrived at node `id` (a CH or the sink)
static void
DataIndication(uint32_t id, McpsDataIndicationParams params, Ptr<Packet>)
{
    g_recv[id]++;
    if (id == SINK)
    {
        // which CH sent it?
        for (auto& kv : g_inFlight)
        {
            if (AddrOf(kv.first) == params.m_srcAddr)
            {
                g_readingsDelivered += kv.second;
                std::cout << std::fixed << std::setprecision(2) << Simulator::Now().GetSeconds()
                          << "s  SINK <- CH" << kv.first << " : fused packet with " << kv.second
                          << " readings" << std::endl;
                kv.second = 0;
                break;
            }
        }
        if (g_anim)
            g_anim->UpdateNodeDescription(SINK, "SINK | readings: " + std::to_string(g_readingsDelivered));
    }
    else
    {
        g_readingsAtCH[id]++;
        uint32_t from = 0;
        for (uint32_t k = 0; k < g_addr.size(); ++k)
            if (g_addr[k] == params.m_srcAddr)
                from = k;
        std::cout << Stamp() << "CH" << id << " <- " << Name(from) << " : reading received ("
                  << g_readingsAtCH[id] << " so far)" << std::endl;
    }
}

// Member i sends its reading to its CH
static void
MemberSend(uint32_t i)
{
    const uint32_t ch = g_ch[g_clusterOf[i]];
    if (ch == i)
        return;
    g_readingsGenerated++;
    std::cout << Stamp() << Name(i) << " -> CH" << ch << " : reading (" << PACKET_SIZE
              << " bytes, TDMA slot)" << std::endl;
    Send(i, ch, static_cast<uint8_t>(g_round));
}

// The MAC reports whether the ACK came back
static void
DataConfirm(uint32_t id, McpsDataConfirmParams params)
{
    const bool ok = (params.m_status == LrWpanMacStatus::SUCCESS);
    if (!ok)
        std::cout << Stamp() << Name(id) << " : no ACK (status "
                  << static_cast<int>(params.m_status) << ")" << std::endl;
}

// The CH fuses the readings (+ its own) and sends one packet to the sink
static void
CHSend(uint32_t c)
{
    const uint32_t ch = g_ch[c];
    g_readingsGenerated++;                         // the CH's own reading
    const uint32_t readings = g_readingsAtCH[ch] + 1;
    g_inFlight[ch] = readings;
    std::cout << std::fixed << std::setprecision(2) << Simulator::Now().GetSeconds() << "s  CH"
              << ch << " fuses " << readings << " readings -> SINK" << std::endl;
    Send(ch, SINK, static_cast<uint8_t>(g_round));
}

// ------------------------------ one round -----------------------------------
static void
StartRound(uint32_t roundsLeft)
{
    if (roundsLeft == 0)
        return;
    ++g_round;
    const double t0 = Simulator::Now().GetSeconds();

    // 1. SETUP: in each cluster, among the nodes that have not been CH in this
    //    epoch (LEACH's G set), the one with the most remaining energy is CH.
    //    When everyone in the cluster has served, a new epoch starts.
    for (uint32_t c = 0; c < N_CLUSTERS; ++c)
    {
        bool anyEligible = false;
        for (uint32_t i = 0; i < N_SENSORS; ++i)
            if (g_clusterOf[i] == c && !g_servedThisEpoch[i])
                anyEligible = true;
        if (!anyEligible)
            for (uint32_t i = 0; i < N_SENSORS; ++i)
                if (g_clusterOf[i] == c)
                    g_servedThisEpoch[i] = false;
        double best = -1.0;
        for (uint32_t i = 0; i < N_SENSORS; ++i)
            if (g_clusterOf[i] == c && !g_servedThisEpoch[i] && Remaining(i) > best)
            {
                best = Remaining(i);
                g_ch[c] = i;
            }
        g_servedThisEpoch[g_ch[c]] = true;
    }
    std::fill(g_readingsAtCH.begin(), g_readingsAtCH.end(), 0);
    std::cout << "\n=== Round " << g_round << " (t = " << t0 << " s)  CHs:";
    for (uint32_t c = 0; c < N_CLUSTERS; ++c)
        std::cout << " cluster" << c << "->S" << g_ch[c];
    std::cout << " ===" << std::endl;
    Paint();

    // 2. MEMBERS: one TDMA slot each (the 3 clusters use their slots in turn)
    std::vector<uint32_t> slotInCluster(N_CLUSTERS, 0);
    for (uint32_t i = 0; i < N_SENSORS; ++i)
    {
        const uint32_t c = g_clusterOf[i];
        if (g_ch[c] == i)
            continue;
        const double t = 1.0 + (slotInCluster[c]++ * N_CLUSTERS + c) * SLOT_TIME;
        Simulator::ScheduleWithContext(i, Seconds(t), &MemberSend, i);
    }

    // 3. CHs send the fused packets to the sink, one after the other
    for (uint32_t c = 0; c < N_CLUSTERS; ++c)
        Simulator::ScheduleWithContext(g_ch[c], Seconds(7.0 + c * SLOT_TIME), &CHSend, c);

    Simulator::Schedule(Seconds(ROUND_TIME - 0.5), &Paint);
    Simulator::Schedule(Seconds(ROUND_TIME), &StartRound, roundsLeft - 1);
}

int
main(int argc, char* argv[])
{
    uint32_t rounds = 6;
    bool pcap = true;
    CommandLine cmd(__FILE__);
    cmd.AddValue("rounds", "Number of rounds (10 s each)", rounds);
    cmd.AddValue("pcap", "Write one Wireshark .pcap file per node", pcap);
    cmd.Parse(argc, argv);

    // ---- nodes and positions: 3 clusters of 4 sensors + sink on top ----
    NodeContainer nodes;
    nodes.Create(N_SENSORS + 1);
    Ptr<ListPositionAllocator> pos = CreateObject<ListPositionAllocator>();
    const double cx[N_CLUSTERS] = {12.0, 40.0, 68.0};
    const double off[4][2] = {{-6, -5}, {6, -6}, {-5, 6}, {7, 5}};
    g_clusterOf.resize(N_SENSORS);
    for (uint32_t i = 0; i < N_SENSORS; ++i)
    {
        const uint32_t c = i / 4;
        g_clusterOf[i] = c;
        pos->Add(Vector(cx[c] + off[i % 4][0], 45.0 + off[i % 4][1], 0.0));
    }
    pos->Add(Vector(40.0, 10.0, 0.0)); // sink
    MobilityHelper mobility;
    mobility.SetPositionAllocator(pos);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(nodes);

    // ---- 802.15.4 devices: one shared channel, one PAN, short addresses 00:01 ... ----
    LrWpanHelper lrWpanHelper;
    NetDeviceContainer devices = lrWpanHelper.Install(nodes);
    lrWpanHelper.CreateAssociatedPan(devices, 0);

    // ---- energy sources ----
    BasicEnergySourceHelper energyHelper;
    energyHelper.Set("BasicEnergySourceInitialEnergyJ", DoubleValue(INITIAL_ENERGY));
    energyHelper.Set("BasicEnergySupplyVoltageV", DoubleValue(SUPPLY_VOLTAGE));
    EnergySourceContainer sources = energyHelper.Install(nodes);
    std::vector<Ptr<LrWpanNetDevice>> devs;
    std::vector<Ptr<SimpleDeviceEnergyModel>> models;
    g_sources = &sources;
    g_dev = &devs;
    g_energyModel = &models;

    g_sent.assign(N_SENSORS + 1, 0);
    g_recv.assign(N_SENSORS + 1, 0);
    g_readingsAtCH.assign(N_SENSORS + 1, 0);
    g_servedThisEpoch.assign(N_SENSORS, false);

    for (uint32_t i = 0; i <= N_SENSORS; ++i)
    {
        Ptr<LrWpanNetDevice> dev = DynamicCast<LrWpanNetDevice>(devices.Get(i));
        g_addr.push_back(dev->GetMac()->GetShortAddress());
        dev->GetMac()->SetMcpsDataIndicationCallback(MakeBoundCallback(&DataIndication, i));
        dev->GetMac()->SetMcpsDataConfirmCallback(MakeBoundCallback(&DataConfirm, i));
        dev->GetPhy()->TraceConnectWithoutContext("TrxState", MakeBoundCallback(&PhyStateChange, i));
        devs.push_back(dev);

        Ptr<SimpleDeviceEnergyModel> em = CreateObject<SimpleDeviceEnergyModel>();
        em->SetNode(nodes.Get(i));
        em->SetEnergySource(sources.Get(i));
        sources.Get(i)->AppendDeviceEnergyModel(em);
        em->SetCurrentA(RX_CURRENT);
        models.push_back(em);
    }

    // ---- Wireshark captures (one file per node) ----
    if (pcap)
        lrWpanHelper.EnablePcapAll("demo-clustered-wsn", true);

    // ---- NetAnim ----
    AnimationInterface anim("demo-clustered-wsn.xml");
    anim.EnablePacketMetadata(true);
    anim.SetMobilityPollInterval(Seconds(100.0));
    g_anim = &anim;
    g_cntEnergy = anim.AddNodeCounter("Remaining Energy (J)", AnimationInterface::DOUBLE_COUNTER);
    g_cntSent = anim.AddNodeCounter("Packets Sent", AnimationInterface::UINT32_COUNTER);
    g_cntRecv = anim.AddNodeCounter("Packets Received", AnimationInterface::UINT32_COUNTER);
    anim.UpdateNodeColor(SINK, 255, 200, 0);
    anim.UpdateNodeSize(SINK, 6.0, 6.0);

    std::cout << "=== Clustered WSN demo: " << N_SENSORS << " sensors, " << N_CLUSTERS
              << " clusters, 1 sink, " << rounds << " rounds of " << ROUND_TIME << " s ===" << std::endl;

    Simulator::Schedule(Seconds(0.0), &StartRound, rounds);
    const double stop = rounds * ROUND_TIME + 1.0;
    Simulator::Stop(Seconds(stop));
    Simulator::Run();

    // ---- summary ----
    std::cout << "\n========================================\n            DEMO RESULTS\n"
              << "========================================\n";
    std::cout << "Rounds                  = " << rounds << "\n";
    std::cout << "Readings generated      = " << g_readingsGenerated << "\n";
    std::cout << "Readings at the sink    = " << g_readingsDelivered << "\n";
    std::cout << std::fixed << std::setprecision(2) << "PDR (readings)          = "
              << (g_readingsGenerated ? 100.0 * g_readingsDelivered / g_readingsGenerated : 0.0)
              << " %\n";
    std::cout << "Packets to the sink     = " << g_recv[SINK] << "  (instead of "
              << g_readingsGenerated << " without clustering)\n";
    for (uint32_t i = 0; i < N_SENSORS; ++i)
        std::cout << "Sensor " << std::setw(2) << i << " (cluster " << g_clusterOf[i]
                  << "): sent " << g_sent[i] << ", received " << g_recv[i] << ", energy left "
                  << std::setprecision(3) << Remaining(i) << " J\n";
    if (pcap)
        std::cout << "Wireshark files: demo-clustered-wsn-<node>-<device>.pcap\n";
    std::cout << "NetAnim file: demo-clustered-wsn.xml\n========================================\n";

    std::cout << std::flush;
    g_anim = nullptr;
    Simulator::Destroy();
    return 0;
}
