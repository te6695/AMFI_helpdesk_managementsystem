import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaTicketAlt, FaCheckCircle, FaClock, FaExclamationTriangle, FaChartBar, FaChartPie } from 'react-icons/fa';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function SubAdminDashboardOverview() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    resolved: 0,
    highPriority: 0,
    urgentPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({});
  const [priorityChartData, setPriorityChartData] = useState({});

  useEffect(() => {
    fetchTickets();
  }, [auth.user?.id, auth.token]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/tickets/index.php?user_id=${auth.user.id}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (response.data.status === 'success') {
        const userTickets = response.data.tickets || [];
        setTickets(userTickets);
        calculateStats(userTickets);
        prepareChartData(userTickets);
      } else {
        setError('Failed to fetch tickets data.');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('An error occurred while fetching tickets data.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ticketsData) => {
    const stats = {
      total: ticketsData.length,
      open: ticketsData.filter(t => t.status === 'open').length,
      assigned: ticketsData.filter(t => t.status === 'assigned').length,
      resolved: ticketsData.filter(t => t.status === 'resolved').length,
      highPriority: ticketsData.filter(t => t.priority === 'high').length,
      urgentPriority: ticketsData.filter(t => t.priority === 'urgent').length
    };
    setStats(stats);
  };

  const prepareChartData = (ticketsData) => {
    // Status distribution chart data
    const statusData = {
      labels: ['Open', 'Assigned', 'Resolved'],
      datasets: [
        {
          label: 'Tickets by Status',
          data: [
            ticketsData.filter(t => t.status === 'open').length,
            ticketsData.filter(t => t.status === 'assigned').length,
            ticketsData.filter(t => t.status === 'resolved').length
          ],
          backgroundColor: [
            'rgba(255, 206, 86, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };

    // Priority distribution chart data
    const priorityData = {
      labels: ['Low', 'Medium', 'High', 'Urgent'],
      datasets: [
        {
          label: 'Tickets by Priority',
          data: [
            ticketsData.filter(t => t.priority === 'low').length,
            ticketsData.filter(t => t.priority === 'medium').length,
            ticketsData.filter(t => t.priority === 'high').length,
            ticketsData.filter(t => t.priority === 'urgent').length
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(255, 99, 132, 0.7)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };

    setChartData(statusData);
    setPriorityChartData(priorityData);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ticket Status Distribution',
      },
    },
  };

  const priorityChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ticket Priority Distribution',
      },
    },
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div>Loading dashboard overview...</div>;
  }

  return (
    <div className="dashboard-overview">
      <h2>My Tickets Overview</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FaTicketAlt />
          </div>
          <div className="stat-info">
            <h3>Total Tickets</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>
        
        <div className="stat-card open">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-info">
            <h3>Open Tickets</h3>
            <p className="stat-number">{stats.open}</p>
          </div>
        </div>
        
        <div className="stat-card assigned">
          <div className="stat-icon">
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3>Assigned Tickets</h3>
            <p className="stat-number">{stats.assigned}</p>
          </div>
        </div>
        
        <div className="stat-card resolved">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>Resolved Tickets</h3>
            <p className="stat-number">{stats.resolved}</p>
          </div>
        </div>
        
        <div className="stat-card high-priority">
          <div className="stat-icon">
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3>High Priority</h3>
            <p className="stat-number">{stats.highPriority}</p>
          </div>
        </div> 
      </div>
      
      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <div className="chart-header">
            <FaChartPie /> Status Distribution
          </div>
          <div className="chart-wrapper">
            {chartData.datasets ? (
              <Pie data={chartData} options={chartOptions} />
            ) : (
              <p>No data available for chart</p>
            )}
          </div>
        </div>
        
        <div className="chart-container">
          <div className="chart-header">
            <FaChartBar /> Priority Distribution
          </div>
          <div className="chart-wrapper">
            {priorityChartData.datasets ? (
              <Bar data={priorityChartData} options={priorityChartOptions} />
            ) : (
              <p>No data available for chart</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Tickets Table */}
      <div className="recent-tickets card">
        <h3>Recent Tickets</h3>
        {tickets.length === 0 ? (
          <p>No tickets found.</p>
        ) : (
          <div className="tickets-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map(ticket => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td className="ticket-subject">{ticket.subject}</td>
                    <td>
                      <span className={`status-badge ${ticket.status}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${ticket.priority}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length > 5 && (
              <div className="view-all-link">
                <Link to="/subadmin/my-tickets">View All Tickets →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubAdminDashboardOverview;