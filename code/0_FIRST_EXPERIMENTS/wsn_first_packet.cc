#include "ns3/core-module.h"
#include "ns3/energy-module.h"
#include "ns3/lr-wpan-module.h"
#include "ns3/mobility-module.h"
#include "ns3/netanim-module.h"
#include "ns3/packet.h"
#include "ns3/propagation-delay-model.h"
#include "ns3/propagation-loss-model.h"
#include "ns3/simulator.h"
#include "ns3/single-model-spectrum-channel.h"

#include <iostream>
#include <sstream>

using namespace ns3;

// =====================================================
// Simulation Parameters
// =====================================================

static double g_simTime = 1000.0;           // seconds (change with --simTime=...)
static const uint32_t PACKET_SIZE = 50;     // bytes
static const double PACKET_INTERVAL = 10.0; // seconds

// =====================================================
// Energy Parameters
// =====================================================

static const double INITIAL_ENERGY = 100.0; // Joules
static const double SUPPLY_VOLTAGE = 3.3;   // Volts
static const double TX_CURRENT = 0.017;     // Ampere
static const double RX_CURRENT = 0.019;     // Ampere
static const double IDLE_CURRENT = 0.001;   // Ampere

// =====================================================
// Energy Models
// =====================================================

Ptr<SimpleDeviceEnergyModel> sensor0Energy;
Ptr<SimpleDeviceEnergyModel> sensor1Energy;
Ptr<SimpleDeviceEnergyModel> sensor2Energy;
Ptr<SimpleDeviceEnergyModel> sinkEnergy;

// =====================================================
// Packet Statistics
// =====================================================

static uint32_t packetsSent = 0;
static uint32_t packetsReceived = 0;
static uint64_t totalBytesReceived = 0;

static uint32_t sentPerNode[4] = {0, 0, 0, 0}; // packets sent by each sensor

// =====================================================
// NetAnim helpers
// =====================================================

static const uint32_t SINK_NODE_ID = 3;
static const double FLASH_TIME = 1.0; // seconds a node stays highlighted

static AnimationInterface* g_anim = nullptr;
static uint32_t g_energyCounterId = 0;
static uint32_t g_sentCounterId = 0;
static uint32_t g_recvCounterId = 0;
static EnergySourceContainer* g_energySources = nullptr; // points to main()'s container (a global one crashes at exit)

static std::string
NodeName(uint32_t nodeId)
{
    if (nodeId == SINK_NODE_ID)
    {
        return "SINK";
    }
    return "Sensor " + std::to_string(nodeId);
}

// Normal look: sensors green, sink blue, label shows packet count
static void
RestoreNode(uint32_t nodeId)
{
    if (g_anim == nullptr)
    {
        return;
    }

    if (nodeId == SINK_NODE_ID)
    {
        g_anim->UpdateNodeColor(nodeId, 0, 0, 255);
        g_anim->UpdateNodeDescription(nodeId,
                                      "SINK | received: " + std::to_string(packetsReceived));
    }
    else
    {
        g_anim->UpdateNodeColor(nodeId, 0, 180, 0);
        g_anim->UpdateNodeDescription(nodeId,
                                      NodeName(nodeId) +
                                          " | sent: " + std::to_string(sentPerNode[nodeId]));
    }
}

// Highlight a node and show a message on it for FLASH_TIME seconds
static void
FlashNode(uint32_t nodeId, uint8_t r, uint8_t g, uint8_t b, const std::string& text)
{
    if (g_anim == nullptr)
    {
        return;
    }

    g_anim->UpdateNodeColor(nodeId, r, g, b);
    g_anim->UpdateNodeDescription(nodeId, text);
    Simulator::Schedule(Seconds(FLASH_TIME), &RestoreNode, nodeId);
}

// Write remaining energy + packet counters into the XML
// (NetAnim: Stats tab -> Node Counters)
static void
UpdateAnimCounters()
{
    if (g_anim == nullptr)
    {
        return;
    }

    for (uint32_t i = 0; i < g_energySources->GetN(); ++i)
    {
        double remaining = g_energySources->Get(i)->GetRemainingEnergy();
        g_anim->UpdateNodeCounter(g_energyCounterId, i, remaining);

        if (i == SINK_NODE_ID)
        {
            g_anim->UpdateNodeCounter(g_recvCounterId, i, packetsReceived);
        }
        else
        {
            g_anim->UpdateNodeCounter(g_sentCounterId, i, sentPerNode[i]);
        }
    }

    if (Simulator::Now().GetSeconds() + PACKET_INTERVAL < g_simTime)
    {
        Simulator::Schedule(Seconds(PACKET_INTERVAL), &UpdateAnimCounters);
    }
}

// =====================================================
// Data Indication Callback (sink received a packet)
// =====================================================

static void
DataIndication(McpsDataIndicationParams params, Ptr<Packet> packet)
{
    packetsReceived++;
    totalBytesReceived += packet->GetSize();

    // Sink turns YELLOW and shows who sent the packet
    std::ostringstream text;
    text << "SINK <<< received #" << packetsReceived << " from " << params.m_srcAddr;
    FlashNode(SINK_NODE_ID, 255, 220, 0, text.str());

    if (packetsReceived % 10 == 0)
    {
        NS_LOG_UNCOND("Received packet #" << packetsReceived << " | Time = "
                                          << Simulator::Now().GetSeconds() << " s");
    }
}

// =====================================================
// Data Confirm Callback
// =====================================================

static void
DataConfirm(McpsDataConfirmParams params)
{
    // Not printed to keep the terminal clean.
}

// =====================================================
// PHY State Change + Energy
// =====================================================

static void
PhyStateChange(std::string context,
               Time now,
               LrWpanPhyEnumeration oldState,
               LrWpanPhyEnumeration newState)
{
    double current = IDLE_CURRENT;

    if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_TX_ON ||
        newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_BUSY_TX)
    {
        current = TX_CURRENT;
    }
    else if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_RX_ON ||
             newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_BUSY_RX)
    {
        current = RX_CURRENT;
    }
    else if (newState == LrWpanPhyEnumeration::IEEE_802_15_4_PHY_TRX_OFF)
    {
        current = 0.0;
    }

    Ptr<SimpleDeviceEnergyModel> energyModel = nullptr;

    if (context == "Sensor0")
    {
        energyModel = sensor0Energy;
    }
    else if (context == "Sensor1")
    {
        energyModel = sensor1Energy;
    }
    else if (context == "Sensor2")
    {
        energyModel = sensor2Energy;
    }
    else if (context == "Sink")
    {
        energyModel = sinkEnergy;
    }

    if (energyModel != nullptr)
    {
        energyModel->SetCurrentA(current);
    }
}

// =====================================================
// Send One Packet
// =====================================================

static void
SendPacket(Ptr<LrWpanMac> mac, uint32_t nodeId, uint8_t handle)
{
    Ptr<Packet> packet = Create<Packet>(PACKET_SIZE);

    McpsDataRequestParams params;
    params.m_dstPanId = 0;
    params.m_srcAddrMode = SHORT_ADDR;
    params.m_dstAddrMode = SHORT_ADDR;
    params.m_dstAddr = Mac16Address("00:04"); // sink
    params.m_msduHandle = handle;
    params.m_txOptions = TX_OPTION_ACK;

    packetsSent++;
    sentPerNode[nodeId]++;

    // Sensor turns RED and shows it is sending
    FlashNode(nodeId,
              255,
              0,
              0,
              NodeName(nodeId) + " >>> sending #" + std::to_string(sentPerNode[nodeId]) +
                  " to SINK");

    Simulator::ScheduleWithContext(nodeId,
                                   Seconds(0.0),
                                   &LrWpanMac::McpsDataRequest,
                                   mac,
                                   params,
                                   packet);
}

// =====================================================
// Generate Periodic Sensor Traffic
// =====================================================

static void
GenerateSensorTraffic(Ptr<LrWpanMac> mac, uint32_t nodeId, uint8_t sensorId, double nextTime)
{
    if (nextTime >= g_simTime)
    {
        return;
    }

    SendPacket(mac, nodeId, sensorId);

    Simulator::Schedule(Seconds(PACKET_INTERVAL),
                        &GenerateSensorTraffic,
                        mac,
                        nodeId,
                        sensorId,
                        nextTime + PACKET_INTERVAL);
}

// =====================================================
// Print Energy Results
// =====================================================

static void
PrintOneNodeEnergy(const std::string& name, Ptr<SimpleDeviceEnergyModel> model, double& total)
{
    double consumed = model->GetTotalEnergyConsumption();
    total += consumed;

    NS_LOG_UNCOND(name << " Consumed = " << consumed << " J");
    NS_LOG_UNCOND(name << " Remaining = " << INITIAL_ENERGY - consumed << " J");
    NS_LOG_UNCOND("");
}

static void
PrintEnergy()
{
    NS_LOG_UNCOND("");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("             ENERGY RESULTS");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("Initial Energy = " << INITIAL_ENERGY << " J");

    double total = 0.0;
    PrintOneNodeEnergy("Sensor 0", sensor0Energy, total);
    PrintOneNodeEnergy("Sensor 1", sensor1Energy, total);
    PrintOneNodeEnergy("Sensor 2", sensor2Energy, total);
    PrintOneNodeEnergy("Sink", sinkEnergy, total);

    NS_LOG_UNCOND("Total Energy Consumed = " << total << " J");
    NS_LOG_UNCOND("========================================");
}

// =====================================================
// Print Baseline Metrics
// =====================================================

static void
PrintMetrics()
{
    NS_LOG_UNCOND("");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("       LONG-TERM BASELINE RESULTS");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("Simulation Time = " << g_simTime << " s");
    NS_LOG_UNCOND("Packets Sent = " << packetsSent);
    NS_LOG_UNCOND("Packets Received = " << packetsReceived);

    double pdr = 0.0;
    if (packetsSent > 0)
    {
        pdr = 100.0 * static_cast<double>(packetsReceived) / static_cast<double>(packetsSent);
    }
    NS_LOG_UNCOND("Packet Delivery Ratio = " << pdr << " %");

    NS_LOG_UNCOND("Total Bytes Received = " << totalBytesReceived << " bytes");

    double throughput = static_cast<double>(totalBytesReceived) * 8.0 / g_simTime;
    NS_LOG_UNCOND("Throughput = " << throughput << " bit/s");

    NS_LOG_UNCOND("Network Lifetime = Not reached within " << g_simTime << " s");
    NS_LOG_UNCOND("========================================");
}

// =====================================================
// Main
// =====================================================

int
main(int argc, char* argv[])
{
    CommandLine cmd(__FILE__);
    cmd.AddValue("simTime", "Simulation time in seconds", g_simTime);
    cmd.Parse(argc, argv);

    // 1. Create Nodes: 0,1,2 = sensors, 3 = sink
    NodeContainer nodes;
    nodes.Create(4);

    // 2. Random Node Positions (20 m x 20 m)
    MobilityHelper mobility;
    Ptr<RandomBoxPositionAllocator> positionAlloc = CreateObject<RandomBoxPositionAllocator>();
    positionAlloc->SetAttribute("X", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=20.0]"));
    positionAlloc->SetAttribute("Y", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=20.0]"));
    positionAlloc->SetAttribute("Z", StringValue("ns3::ConstantRandomVariable[Constant=0.0]"));
    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(nodes);

    // 3. Create LR-WPAN Devices
    Ptr<LrWpanNetDevice> dev0 = CreateObject<LrWpanNetDevice>();
    Ptr<LrWpanNetDevice> dev1 = CreateObject<LrWpanNetDevice>();
    Ptr<LrWpanNetDevice> dev2 = CreateObject<LrWpanNetDevice>();
    Ptr<LrWpanNetDevice> sinkDev = CreateObject<LrWpanNetDevice>();

    // 4. Assign MAC Addresses
    dev0->SetAddress(Mac16Address("00:01"));
    dev1->SetAddress(Mac16Address("00:02"));
    dev2->SetAddress(Mac16Address("00:03"));
    sinkDev->SetAddress(Mac16Address("00:04"));

    // 5. Set PAN ID
    dev0->GetMac()->SetPanId(0);
    dev1->GetMac()->SetPanId(0);
    dev2->GetMac()->SetPanId(0);
    sinkDev->GetMac()->SetPanId(0);

    // 6. Create LR-WPAN Channel
    Ptr<SingleModelSpectrumChannel> channel = CreateObject<SingleModelSpectrumChannel>();
    Ptr<LogDistancePropagationLossModel> lossModel =
        CreateObject<LogDistancePropagationLossModel>();
    Ptr<ConstantSpeedPropagationDelayModel> delayModel =
        CreateObject<ConstantSpeedPropagationDelayModel>();
    channel->AddPropagationLossModel(lossModel);
    channel->SetPropagationDelayModel(delayModel);

    // 7. Connect Devices to Channel
    dev0->SetChannel(channel);
    dev1->SetChannel(channel);
    dev2->SetChannel(channel);
    sinkDev->SetChannel(channel);

    // 8. Add Devices to Nodes
    nodes.Get(0)->AddDevice(dev0);
    nodes.Get(1)->AddDevice(dev1);
    nodes.Get(2)->AddDevice(dev2);
    nodes.Get(3)->AddDevice(sinkDev);

    // 9. Connect PHY to Mobility
    dev0->GetPhy()->SetMobility(nodes.Get(0)->GetObject<MobilityModel>());
    dev1->GetPhy()->SetMobility(nodes.Get(1)->GetObject<MobilityModel>());
    dev2->GetPhy()->SetMobility(nodes.Get(2)->GetObject<MobilityModel>());
    sinkDev->GetPhy()->SetMobility(nodes.Get(3)->GetObject<MobilityModel>());

    // 10. Create Energy Sources
    BasicEnergySourceHelper energySourceHelper;
    energySourceHelper.Set("BasicEnergySourceInitialEnergyJ", DoubleValue(INITIAL_ENERGY));
    energySourceHelper.Set("BasicEnergySupplyVoltageV", DoubleValue(SUPPLY_VOLTAGE));
    EnergySourceContainer energySources = energySourceHelper.Install(nodes);

    // 11. Create Device Energy Models
    sensor0Energy = CreateObject<SimpleDeviceEnergyModel>();
    sensor1Energy = CreateObject<SimpleDeviceEnergyModel>();
    sensor2Energy = CreateObject<SimpleDeviceEnergyModel>();
    sinkEnergy = CreateObject<SimpleDeviceEnergyModel>();

    // 12. Connect Energy Models to Nodes
    sensor0Energy->SetNode(nodes.Get(0));
    sensor1Energy->SetNode(nodes.Get(1));
    sensor2Energy->SetNode(nodes.Get(2));
    sinkEnergy->SetNode(nodes.Get(3));

    // 13. Connect Energy Models to Sources
    sensor0Energy->SetEnergySource(energySources.Get(0));
    sensor1Energy->SetEnergySource(energySources.Get(1));
    sensor2Energy->SetEnergySource(energySources.Get(2));
    sinkEnergy->SetEnergySource(energySources.Get(3));

    // 14. Add Device Energy Models
    energySources.Get(0)->AppendDeviceEnergyModel(sensor0Energy);
    energySources.Get(1)->AppendDeviceEnergyModel(sensor1Energy);
    energySources.Get(2)->AppendDeviceEnergyModel(sensor2Energy);
    energySources.Get(3)->AppendDeviceEnergyModel(sinkEnergy);

    // 15. Initial Current
    sensor0Energy->SetCurrentA(RX_CURRENT);
    sensor1Energy->SetCurrentA(RX_CURRENT);
    sensor2Energy->SetCurrentA(RX_CURRENT);
    sinkEnergy->SetCurrentA(RX_CURRENT);

    // 16. Transmission Callbacks
    dev0->GetMac()->SetMcpsDataConfirmCallback(MakeCallback(&DataConfirm));
    dev1->GetMac()->SetMcpsDataConfirmCallback(MakeCallback(&DataConfirm));
    dev2->GetMac()->SetMcpsDataConfirmCallback(MakeCallback(&DataConfirm));

    // 17. Sink Reception Callback
    sinkDev->GetMac()->SetMcpsDataIndicationCallback(MakeCallback(&DataIndication));

    // 18. PHY State Tracing
    dev0->GetPhy()->TraceConnect("TrxState", "Sensor0", MakeCallback(&PhyStateChange));
    dev1->GetPhy()->TraceConnect("TrxState", "Sensor1", MakeCallback(&PhyStateChange));
    dev2->GetPhy()->TraceConnect("TrxState", "Sensor2", MakeCallback(&PhyStateChange));
    sinkDev->GetPhy()->TraceConnect("TrxState", "Sink", MakeCallback(&PhyStateChange));

    // =================================================
    // 19. NetAnim
    // =================================================

    AnimationInterface anim("wsn-first-packet.xml");
    anim.EnablePacketMetadata(true);

    // Nodes don't move -> record positions less often (smaller XML)
    anim.SetMobilityPollInterval(Seconds(10.0));

    g_anim = &anim;
    g_energySources = &energySources;

    // Starting colors and labels
    for (uint32_t i = 0; i < nodes.GetN(); ++i)
    {
        RestoreNode(i);
    }

    // Counters (Stats tab -> Node Counters)
    g_energyCounterId =
        anim.AddNodeCounter("Remaining Energy (J)", AnimationInterface::DOUBLE_COUNTER);
    g_sentCounterId = anim.AddNodeCounter("Packets Sent", AnimationInterface::UINT32_COUNTER);
    g_recvCounterId = anim.AddNodeCounter("Packets Received", AnimationInterface::UINT32_COUNTER);
    Simulator::Schedule(Seconds(0.0), &UpdateAnimCounters);

    // =================================================
    // 20. Start Simulation
    // =================================================

    NS_LOG_UNCOND("");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("       STARTING LONG-TERM BASELINE");
    NS_LOG_UNCOND("========================================");
    NS_LOG_UNCOND("Simulation Time = " << g_simTime << " s");
    NS_LOG_UNCOND("Packet Interval = " << PACKET_INTERVAL << " s");
    NS_LOG_UNCOND("Packet Size = " << PACKET_SIZE << " bytes");
    NS_LOG_UNCOND("========================================");

    Simulator::Schedule(Seconds(1.0), &GenerateSensorTraffic, dev0->GetMac(), 0, 0, 1.0);
    Simulator::Schedule(Seconds(2.0), &GenerateSensorTraffic, dev1->GetMac(), 1, 1, 2.0);
    Simulator::Schedule(Seconds(3.0), &GenerateSensorTraffic, dev2->GetMac(), 2, 2, 3.0);

    // 21. Print Results Near End
    Simulator::Schedule(Seconds(g_simTime - 1.0), &PrintEnergy);
    Simulator::Schedule(Seconds(g_simTime - 0.5), &PrintMetrics);

    // 22-24. Run
    Simulator::Stop(Seconds(g_simTime));
    Simulator::Run();
    Simulator::Destroy();

    NS_LOG_UNCOND("");
    NS_LOG_UNCOND("Long-term baseline simulation finished.");

    return 0;
}
