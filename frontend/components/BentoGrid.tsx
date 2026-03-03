'use client';

export default function BentoGrid() {
    return (
        <section className="py-24 bg-[#020A20]">
            <div className="max-w-6xl mx-auto px-12 md:px-24">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white">
                        The Gateway to <span className="bg-gradient-to-r from-[#2D50A2] to-[#041A54] bg-clip-text text-transparent">AI Data</span>
                    </h2>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Left: Portrait Image */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[500px] md:h-auto md:row-span-2">
                        <img
                            src="/bento/landscape1.png"
                            alt="Chainlink Agent Marketplace"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020515]/70 via-transparent to-transparent" />
                    </div>

                    {/* Right Top: Landscape Image 1 */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[240px] md:h-auto">
                        <img
                            src="/bento/landscape2.png"
                            alt="Privacy intact with Chainlink Agent"
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020515]/70 via-transparent to-transparent" />
                    </div>

                    {/* Right Bottom: Landscape Image 2 */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group h-[240px] md:h-auto">
                        <img
                            src="/bento/landscape3.png"
                            alt="Powered by Ethereum and Chainlink"
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020515]/70 via-transparent to-transparent" />
                    </div>
                </div>
            </div>
        </section>
    );
}
