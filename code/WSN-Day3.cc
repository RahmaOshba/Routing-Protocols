#include "ns3/core-module.h"
#include "ns3/lr-wpan-module.h"
#include "ns3/mobility-module.h"
#include "ns3/network-module.h"

#include <iomanip>
#include <iostream>
#include <map>

// In ns-3.41 the lr-wpan classes (LrWpanNetDevice, McpsDataRequestParams, ...)
// live in the ns3::lrwpan namespace. This empty declaration makes the
// "using" line below valid on any version.
namespace ns3
{
namespace lrwpan
{
}
} // namespace ns3

using namespace ns3;
using namespace ns3::lrwpan;

// =====================================
// Global statistics
// =====================================

static uint32_t g_packetSize = 20;                      // bytes of payload
static std::map<uint32_t, uint32_t> g_sent;             // nodeId -> packets sent
static std::map<uint32_t, uint32_t> g_confirmedOk;      // nodeId -> MAC confirms with SUCCESS
static std::map<Mac16Address, uint32_t> g_received;     // source address -> packets received at sink

// =====================================
// Sensor: send one packet to the sink
// =====================================

static void
SendPacket(Ptr<LrWpanNetDevice> dev, Mac16Address sinkAddr, uint8_t handle)
{
    Ptr<Packet> p = Create<Packet>(g_packetSize);

    McpsDataRequestParams params;
    params.m_srcAddrMode = SHORT_ADDR;
    params.m_dstAddrMode = SHORT_ADDR;
    params.m_dstPanId = 0;
    params.m_dstAddr = sinkAddr;
    params.m_msduHandle = handle;
    params.m_txOptions = TX_OPTION_ACK; // ask the sink for an ACK

    uint32_t nodeId = dev->GetNode()->GetId();
    g_sent[nodeId]++;

    std::cout << std::fixed << std::setprecision(3) << Simulator::Now().GetSeconds() << "s  Node "
              << nodeId << " (" << dev->GetMac()->GetShortAddress() << ") sends packet #"
              << static_cast<uint32_t>(handle) << " to sink " << sinkAddr << std::endl;

    dev->GetMac()->McpsDataRequest(params, p);
}

// =====================================
// Sensor: MAC reports the result of a transmission
// =====================================

static void
DataConfirm(uint32_t nodeId, McpsDataConfirmParams params)
{
    int status = static_cast<int>(params.m_status);
    if (status == 0)
    {
        g_confirmedOk[nodeId]++;
    }

    std::cout << std::fixed << std::setprecision(3) << Simulator::Now().GetSeconds() << "s  Node "
              << nodeId << " MAC confirm for packet #" << static_cast<uint32_t>(params.m_msduHandle)
              << ": status " << status << (status == 0 ? " (SUCCESS)" : " (FAILED)") << std::endl;
}

// =====================================
// Sink: a packet arrived
// =====================================

static void
DataIndication(McpsDataIndicationParams params, Ptr<Packet> p)
{
    g_received[params.m_srcAddr]++;

    std::cout << std::fixed << std::setprecision(3) << Simulator::Now().GetSeconds()
              << "s  SINK received " << p->GetSize() << " bytes from " << params.m_srcAddr
              << " (LQI " << static_cast<uint32_t>(params.m_mpduLinkQuality) << ")" << std::endl;
}

int
main(int argc, char* argv[])
{
    uint32_t numPackets = 5;  // packets per sensor
    double interval = 1.0;    // seconds between packets from the same sensor

    CommandLine cmd(__FILE__);
    cmd.AddValue("numPackets", "Number of packets each sensor sends", numPackets);
    cmd.AddValue("interval", "Seconds between packets of one sensor", interval);
    cmd.AddValue("packetSize", "Payload size in bytes", g_packetSize);
    cmd.Parse(argc, argv);

    // =====================================
    // Create Nodes
    // =====================================

    NodeContainer sensorNodes;
    sensorNodes.Create(3);

    NodeContainer sinkNode;
    sinkNode.Create(1);

    // =====================================
    // Mobility & Position
    // =====================================

    MobilityHelper mobility;
    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator>();

    positionAlloc->Add(Vector(0.0, 0.0, 0.0));   // Sensor 1
    positionAlloc->Add(Vector(20.0, 0.0, 0.0));  // Sensor 2
    positionAlloc->Add(Vector(40.0, 0.0, 0.0));  // Sensor 3
    positionAlloc->Add(Vector(20.0, 20.0, 0.0)); // Sink

    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(sensorNodes);
    mobility.Install(sinkNode);

    // =====================================
    // Install LR-WPAN Devices
    // =====================================

    LrWpanHelper lrWpanHelper;

    NetDeviceContainer sensorDevices = lrWpanHelper.Install(sensorNodes);
    NetDeviceContainer sinkDevice = lrWpanHelper.Install(sinkNode);

    // =====================================
    // Put All Nodes in Same PAN (unique short addresses)
    // =====================================

    NetDeviceContainer allDevices;
    allDevices.Add(sensorDevices);
    allDevices.Add(sinkDevice);

    lrWpanHelper.CreateAssociatedPan(allDevices, 0);

    std::cout << "=== Addresses ===" << std::endl;
    for (uint32_t i = 0; i < allDevices.GetN(); ++i)
    {
        Ptr<LrWpanNetDevice> dev = DynamicCast<LrWpanNetDevice>(allDevices.Get(i));
        std::cout << "Node " << dev->GetNode()->GetId() << " -> " << dev->GetMac()->GetShortAddress()
                  << (i == allDevices.GetN() - 1 ? "  (SINK)" : "  (sensor)") << std::endl;
    }
    std::cout << std::endl;

    // =====================================
    // Callbacks
    // =====================================

    Ptr<LrWpanNetDevice> sinkDev = DynamicCast<LrWpanNetDevice>(sinkDevice.Get(0));
    Mac16Address sinkAddr = sinkDev->GetMac()->GetShortAddress();

    sinkDev->GetMac()->SetMcpsDataIndicationCallback(MakeCallback(&DataIndication));

    for (uint32_t i = 0; i < sensorDevices.GetN(); ++i)
    {
        Ptr<LrWpanNetDevice> dev = DynamicCast<LrWpanNetDevice>(sensorDevices.Get(i));
        uint32_t nodeId = dev->GetNode()->GetId();
        dev->GetMac()->SetMcpsDataConfirmCallback(MakeBoundCallback(&DataConfirm, nodeId));
    }

    // =====================================
    // Schedule Traffic: sensors -> sink
    // (each sensor starts 0.2 s after the previous one to reduce collisions)
    // =====================================

    for (uint32_t i = 0; i < sensorDevices.GetN(); ++i)
    {
        Ptr<LrWpanNetDevice> dev = DynamicCast<LrWpanNetDevice>(sensorDevices.Get(i));
        uint32_t nodeId = dev->GetNode()->GetId();

        for (uint32_t k = 0; k < numPackets; ++k)
        {
            double t = 1.0 + i * 0.2 + k * interval;
            Simulator::ScheduleWithContext(nodeId,
                                           Seconds(t),
                                           &SendPacket,
                                           dev,
                                           sinkAddr,
                                           static_cast<uint8_t>(k));
        }
    }

    // Optional: packet captures (open with Wireshark)
    lrWpanHelper.EnablePcapAll("wsn-day3", false);

    double stopTime = 1.0 + sensorDevices.GetN() * 0.2 + numPackets * interval + 1.0;
    Simulator::Stop(Seconds(stopTime));
    Simulator::Run();

    // =====================================
    // Summary
    // =====================================

    std::cout << std::endl << "=== Summary ===" << std::endl;
    uint32_t totalSent = 0;
    uint32_t totalRecv = 0;

    for (uint32_t i = 0; i < sensorDevices.GetN(); ++i)
    {
        Ptr<LrWpanNetDevice> dev = DynamicCast<LrWpanNetDevice>(sensorDevices.Get(i));
        uint32_t nodeId = dev->GetNode()->GetId();
        Mac16Address addr = dev->GetMac()->GetShortAddress();

        uint32_t sent = g_sent[nodeId];
        uint32_t recv = g_received[addr];
        totalSent += sent;
        totalRecv += recv;

        double pdr = sent > 0 ? 100.0 * recv / sent : 0.0;
        std::cout << "Sensor node " << nodeId << " (" << addr << "): sent " << sent
                  << ", received at sink " << recv << ", ACKed " << g_confirmedOk[nodeId]
                  << ", PDR " << std::setprecision(1) << pdr << "%" << std::endl;
    }

    double totalPdr = totalSent > 0 ? 100.0 * totalRecv / totalSent : 0.0;
    std::cout << "TOTAL: sent " << totalSent << ", received " << totalRecv << ", PDR "
              << std::setprecision(1) << totalPdr << "%" << std::endl;

    Simulator::Destroy();
    return 0;
}
