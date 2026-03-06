import Image from 'next/image';

const layerInfo = [
    {
        title: "x402 Gateway Challenge",
        description: "Agent requests a resource, receives a 402 challenge with escrow key, contract address, and required deposit amount",
        color: "#2D50A2",
        image: "/bento/landscape2.png"
    },
    {
        title: "On-Chain Escrow Deposit",
        description: "Agent deposits ETH into the escrow contract, retries with X-Payment header, and receives the paywalled content",
        color: "#132A63",
        image: "/bento/landscape1.png"
    },
    {
        title: "Settlement or Dispute",
        description: "Agent calls requestSettlement or raiseDispute; CRE workflows finalize the outcome on-chain via Chainlink Automation",
        color: "#041A54",
        image: "/bento/landscape2.png"
    },
    {
        title: "Private Shielded Payout",
        description: "Settled funds move from platform treasury to the merchant's shielded address via Chainlink Private Tokens — sender hidden, balances confidential",
        color: "#0D1B39",
        image: "/bento/landscape3.png"
    }
];

export default function PaymentStackScroll() {
    return (
        <section className="py-24 bg-[#020A20]">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Payment <span className="bg-gradient-to-r from-[#2D50A2] to-[#041A54] bg-clip-text text-transparent">Protocol Stack</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Four layers of trust — from payment initiation to private, shielded settlement.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {layerInfo.map((layer, index) => (
                        <div key={layer.title} className="group">
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#2D50A2]/8">
                                {/* Image */}
                                <div className="aspect-video bg-gradient-to-br from-[#060E1F] to-[#020716] relative">
                                    <Image
                                        src={layer.image}
                                        alt={layer.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                {/* Card Content */}
                                <div className="p-6 bg-gradient-to-br from-[#031030]/80 to-[#020515]/70">
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
