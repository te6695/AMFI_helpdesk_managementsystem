import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const TicketStatusChart = ({ tickets }) => {
  const statusData = [
    { name: 'Open', value: tickets.filter(t => t.status === 'open').length },
    { name: 'Assigned', value: tickets.filter(t => t.status === 'assigned').length },
    { name: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length },
  ];

  return (
    <div className="chart-container">
      <h3>Ticket Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TicketPriorityChart = ({ tickets }) => {
  const priorityData = [
    { name: 'High', value: tickets.filter(t => t.priority === 'high').length },
    { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length },
    { name: 'Low', value: tickets.filter(t => t.priority === 'low').length },
  ];

  return (
    <div className="chart-container">
      <h3>Ticket Priority Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={priorityData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TicketCategoryChart = ({ tickets }) => {
  const categoryCount = {};
  tickets.forEach(ticket => {
    categoryCount[ticket.category] = (categoryCount[ticket.category] || 0) + 1;
  });

  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="chart-container">
      <h3>Ticket Categories</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categoryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#0fe5beff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};