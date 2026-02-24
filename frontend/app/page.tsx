import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import BentoGrid from '@/components/BentoGrid';
import FeatureShowcase from '@/components/FeatureShowcase';
import PaymentStackScroll from '@/components/PaymentStackScroll';
import Footer from '@/components/Footer';

export default function Home() {
    return (
        <>
            <Navbar />
            <main>
                <Hero />
                <BentoGrid />
                <FeatureShowcase />
                <PaymentStackScroll />
                <Footer />
            </main>
        </>
    );
}
