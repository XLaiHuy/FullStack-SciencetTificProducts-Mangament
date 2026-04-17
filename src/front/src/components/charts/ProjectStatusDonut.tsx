import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

let chartRegistered = false;

if (!chartRegistered) {
  ChartJS.register(ArcElement, Tooltip, Legend);
  chartRegistered = true;
}

export type ProjectStatusSlice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  data: ProjectStatusSlice[];
};

const ProjectStatusDonut: React.FC<Props> = ({ data }) => {
  return (
    <Pie
      data={{
        labels: data.map((slice) => slice.label),
        datasets: [
          {
            data: data.map((slice) => slice.value),
            backgroundColor: data.map((slice) => slice.color),
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      }}
      options={{
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return ` ${context.label}: ${context.raw}%`;
              },
            },
          },
        },
        cutout: '65%',
        animation: {
          animateScale: false,
          duration: 380,
        },
      }}
    />
  );
};

export default ProjectStatusDonut;