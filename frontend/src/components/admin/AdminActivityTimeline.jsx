import React from 'react';

export default function AdminActivityTimeline({
  events = [],
}) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
        No lifecycle events recorded for this operation.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem', margin: '1rem 0' }}>
      {/* Vertical Track Line */}
      <div
        style={{
          position: 'absolute',
          left: '7px',
          top: '6px',
          bottom: '6px',
          width: '2px',
          backgroundColor: '#e2e8f0',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {events.map((event, idx) => {
          const isComplete = event.status === 'COMPLETED' || event.status === 'SUCCESS' || event.status === 'DONE';
          const isPending = event.status === 'PENDING' || event.status === 'PROCESSING' || event.status === 'IN_PROGRESS';
          const isFailed = event.status === 'FAILED' || event.status === 'ERROR' || event.status === 'FLAGGED';

          let dotColor = '#3b82f6';
          let dotBorder = '#93c5fd';
          if (isComplete) {
            dotColor = '#10b981';
            dotBorder = '#a7f3d0';
          } else if (isPending) {
            dotColor = '#f59e0b';
            dotBorder = '#fde68a';
          } else if (isFailed) {
            dotColor = '#ef4444';
            dotBorder = '#fca5a5';
          }

          return (
            <div key={idx} style={{ position: 'relative' }}>
              {/* Bullet Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-1.5rem',
                  top: '3px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: dotColor,
                  border: `3px solid ${dotBorder}`,
                  boxShadow: '0 0 0 2px #ffffff',
                }}
              />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {event.title}
                  </span>
                  {event.timestamp && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {typeof event.timestamp === 'string' && event.timestamp.includes('T')
                        ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : event.timestamp}
                    </span>
                  )}
                </div>

                {event.description && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                    {event.description}
                  </p>
                )}

                {event.details && (
                  <div
                    style={{
                      marginTop: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {event.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
