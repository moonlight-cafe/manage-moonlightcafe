import React from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

const EChartPie = ({ data }) => {
  // Define custom colors for the cafe theme
  const themeColors = ["#47d9a8", "#f59e0b", "#ef4444", "#0ea5e9", "#94a3b8"];

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(17, 33, 28, 0.9)",
      borderColor: "rgba(71, 217, 168, 0.3)",
      borderWidth: 1,
      padding: [10, 15],
      borderRadius: 12,
      textStyle: {
        color: "#bdeedd",
        fontSize: 13,
        fontWeight: 500,
      },
      extraCssText: "box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(8px);",
      formatter: (p) => {
        return `
          <div style="margin-bottom: 4px; font-weight: 700; color: #47d9a8;">${p.name}</div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="opacity: 0.8;">Value:</span>
            <span style="font-weight: 600;">${p.value}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="opacity: 0.8;">Share:</span>
            <span style="font-weight: 600;">${p.percent}%</span>
          </div>
        `;
      },
    },

    series: [
      // 🌈 Outer subtle ring for depth
      {
        type: "pie",
        radius: ["82%", "83%"],
        center: ["50%", "45%"],
        silent: true,
        label: { show: false },
        itemStyle: {
          color: "rgba(189, 238, 221, 0.1)",
        },
        data: [{ value: 1 }],
      },

      // 🟢 Main pie
      {
        type: "pie",
        radius: "72%",
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#11211c",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}\n{d}%",
          color: "#bdeedd",
          fontSize: 11,
          fontWeight: 500,
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 15,
          smooth: true,
          lineStyle: {
            color: "rgba(189, 238, 221, 0.3)",
            width: 1,
          },
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: "rgba(0,0,0,0.5)",
          },
        },
        data: data.map((item, idx) => ({
          ...item,
          itemStyle: {
            color: themeColors[idx % themeColors.length],
          },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260 }} />;
};

export default EChartPie;