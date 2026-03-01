import Image from 'next/image';

const layerInfo = [
    {
        title: "Payment Initialization",
        description: "Agent initiates a private payment request through the x402 protocol",
        color: "#4C8BF5",
        image: "/landing/payment_init.png"
    },
    {
        title: "x402 Protocol Verification",
        description: "Chainlink oracle verifies the payment without exposing transaction details",
        color: "#375BD2",
        image: "/landing/x402_verify.png"
    },
    {
        title: "Chainlink Agent Privacy Layer",
        description: "Funds locked in secure escrow while maintaining complete privacy",
        color: "#2A4AB0",
        image: "/landing/privacy_layer.png"
    },
    {
        title: "Settlement Complete",
        description: "Transaction verified, privacy preserved, settlement finalized",
        color: "#1a3a9e",
        image: "/landing/settlement.png"
    }
];

export default function PaymentStackScroll() {
    return (
        <section className="py-24 bg-black">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Payment <span className="bg-gradient-to-r from-[#375BD2] to-[#4C8BF5] bg-clip-text text-transparent">Protocol Stack</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Four layers of trust — from payment initiation to final settlement.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {layerInfo.map((layer, index) => (
                        <div key={layer.title} className="group">
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#375BD2]/5">
                                {/* Image */}
                                <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] relative">
                                    <Image
                                        src={layer.image}
                                        alt={layer.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                {/* Card Content */}
                                <div className="p-6 bg-gradient-to-br from-[#0f1a2e]/80 to-[#0a1020]/60">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                                            style={{ backgroundColor: layer.color }}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">
                                                {layer.title}
                                            </h3>
                                            <p className="text-sm text-gray-400 leading-relaxed">
                                                {layer.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
