import React from 'react';
import Xarrow from 'react-xarrows';
import TubelightEffect from './TubelightEffect';

const ArrowLayer = ({ connections }) => {
  return (
    <>
      {connections.map((conn, index) => (
        <React.Fragment key={index}>
          {/* This component handles the arrow drawing */}
          <Xarrow
            start={conn.from}
            end={conn.to}
            labels={conn.label}
            color={conn.color}
            strokeWidth={conn.width ?? 2}
            headSize={(conn.width ?? 2) * 2.5}
            curveness={0.8}
            path="smooth"
            passProps={{
              arrowHead: {
                style: {
                  strokeWidth: 0,
                },
              },
            }}
          />
          {/* This component handles the glow effect on the target card */}
          <TubelightEffect to={conn.to} color={conn.color} />
        </React.Fragment>
      ))}
    </>
  );
};

export default ArrowLayer;


