import React from "react";
import ReactECharts from "echarts-for-react";
import { Config } from "./Init.js";


const EChartPie = ({ data }) => {

  // Filter out items with 0 value and remove "Other"
  const filteredData = data.filter(
    (item) => item.value > 0 && item.name.toLowerCase() !== "other"
  );

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(17, 33, 28, 0.9)",
      borderColor: "rgba(71, 217, 168, 0.3)",
      borderWidth: 1,
      padding: [12, 16],
      borderRadius: 6,
      textStyle: {
        color: "#4b5563",
        fontSize: 13,
      },
      extraCssText: "box-shadow: 0 6px 16px rgba(0,0,0,0.15);",
      formatter: (p) => {
        return `
          <div style="margin-bottom: 6px; font-weight: 700; color: #4b5563; font-size: 14px;">${p.name}</div>
          <div style="color: #6b7280; font-size: 13px;">Count : <span style="font-weight: 700; color: #374151;">${p.value}</span> (${p.percent}%)</div>
        `;
      },
    },
    legend: {
      show: true,
      bottom: "0%",
      left: "center",
      icon: "circle",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        color: "#4b5563",
        fontSize: 12,
      },
    },
    series: [
      {
        type: "pie",
        radius: "65%",
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "outside",
          formatter: "{b}",
          color: "#4b5563",
          fontSize: 12,
        },
        labelLine: {
          show: true,
          smooth: 0.2,
          length: 15,
          length2: 20,
        },
        emphasis: {
          scale: true,
          scaleSize: 2,
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.4)",
          },
        },
        data: filteredData.map((item, index) => {
          const hex = Config.themeColors[index % Config.themeColors.length];
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return {
            ...item,
            itemStyle: {
              color: `rgba(${r}, ${g}, ${b}, 0.3)`,
              borderColor: hex,
              shadowBlur: 8,
              shadowColor: "rgba(0,0,0,0.15)",
              shadowOffsetY: 4,
              shadowOffsetX: 2,
            },
          };
        }),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260, width: "100%" }} />;
};

export default EChartPie;
