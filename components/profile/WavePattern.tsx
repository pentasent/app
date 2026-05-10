import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

interface WavePatternProps {
  width: number;
  height: number;
  style?: ViewStyle;
  baseColor?: string;
  secondaryColor?: string;
}

export const WavePattern = ({
  width,
  height,
  style,
  baseColor = colors.primary,
  secondaryColor = colors.secondary,
}: WavePatternProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      <Defs>
        <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={baseColor} stopOpacity="0.15" />
          <Stop offset="1" stopColor={secondaryColor} stopOpacity="0.1" />
        </LinearGradient>
        
        <LinearGradient id="circleGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={baseColor} stopOpacity="0.1" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft Decorative Circles (Bokeh Effect) */}
      <Circle cx={width * 0.1} cy={height * 0.3} r={40} fill="url(#circleGrad)" />
      <Circle cx={width * 0.85} cy={height * 0.15} r={60} fill="url(#circleGrad)" opacity={0.6} />
      <Circle cx={width * 0.5} cy={height * 0.8} r={30} fill={secondaryColor} opacity={0.05} />

      {/* Triple Layered Waves */}
      <Path
        d={`M0,${height * 0.75} 
           C${width * 0.2},${height * 0.6} 
            ${width * 0.4},${height * 1.0} 
            ${width},${height * 0.7} 
           L${width},${height} 
           L0,${height} Z`}
        fill="url(#waveGrad)"
      />

      <Path
        d={`M0,${height * 0.65} 
           C${width * 0.35},${height * 0.9} 
            ${width * 0.65},${height * 0.4} 
            ${width},${height * 0.8} 
           L${width},${height} 
           L0,${height} Z`}
        fill={secondaryColor}
        fillOpacity="0.06"
      />

      <Path
        d={`M0,${height * 0.85} 
           C${width * 0.25},${height * 0.95} 
            ${width * 0.75},${height * 0.75} 
            ${width},${height * 0.9} 
           L${width},${height} 
           L0,${height} Z`}
        fill={baseColor}
        fillOpacity="0.08"
      />
    </Svg>
  );
};