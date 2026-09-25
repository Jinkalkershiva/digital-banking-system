import React from 'react';
import ArchitectureDiagram from './ArchitectureDiagram';

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#c084fc',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <span>🏛️ Microservices Topology</span>
          </div>
          <h2 className="dgb-section-title">
            Inside DGBASE: Microservices & Event Bus
          </h2>
          <p className="dgb-section-desc">
            Explore the 7 decoupled Spring Boot microservices, Kafka distributed event bus,
            Redis cache, and MySQL database ledgers. Click any service node to inspect its
            live interfaces and engineering role.
          </p>
        </div>

        {/* Interactive Architecture Canvas */}
        <ArchitectureDiagram />
      </div>
    </section>
  );
}
