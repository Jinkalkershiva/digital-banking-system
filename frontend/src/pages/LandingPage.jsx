import React, { useEffect } from 'react';
import {
  LandingNavbar,
  HeroSection,
  EngineeringHighlights,
  ArchitectureSection,
  TransactionFlow,
  SecuritySection,
  TechStack,
  PlatformOverview,
  AdminShowcase,
  EngineeringChallenges,
  RecruiterSection,
  LandingFooter,
} from '../components/landing';
import '../styles/landing.css';

export default function LandingPage({ currentAccount, onLogout }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="dgbase-landing-root">
      {/* Background Ambience Layer */}
      <div className="dgbase-bg-canvas" aria-hidden="true" />

      {/* Sticky Glass Navbar */}
      <LandingNavbar currentAccount={currentAccount} onLogout={onLogout} />

      {/* Main Showcase Sections */}
      <main>
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Engineering Highlights */}
        <EngineeringHighlights />

        {/* 3. Microservices Architecture Section & Diagram */}
        <ArchitectureSection />

        {/* 4. Interactive Transaction SAGA Flow */}
        <TransactionFlow />

        {/* 5. Enterprise Banking Security */}
        <SecuritySection />

        {/* 6. Verified Technology Stack */}
        <TechStack />

        {/* 7. Live Platform Telemetry */}
        <PlatformOverview />

        {/* 8. Admin Control Center Showcase */}
        <AdminShowcase />

        {/* 9. Deep-Dive Engineering Challenges Solved */}
        <EngineeringChallenges />

        {/* 10. Recruiter & Portfolio Checklist */}
        <RecruiterSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
