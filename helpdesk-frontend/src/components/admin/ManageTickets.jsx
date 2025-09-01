import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { FaFilter, FaSearch, FaTable } from 'react-icons/fa';

function ManageTickets() {
  const { auth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    directorate: '',
    category: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setError('You are not authorized to view this page.');
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [auth.isAuthenticated, auth.token]);

  useEffect(() => {
    applyFilters();
  }, [filters, searchTerm, tickets, users]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      
      const [ticketsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tickets/index.php`, { headers }),
        axios.get(`${API_BASE_URL}/users/index.php`, { headers })
      ]);

      if (ticketsRes.data.status === 'success') {
        setTickets(ticketsRes.data.tickets || []);
      } else {
        setError(ticketsRes.data.message || 'Failed to fetch tickets.');
        setTickets([]);
      }

      if (usersRes.data.status === 'success') {
        setUsers(usersRes.data.users || []);
      } else {
        setError(prev => prev + (prev ? ' | ' : '') + (usersRes.data.message || 'Failed to fetch users.'));
        setUsers([]);
      }

    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.response?.data?.message || 'An error occurred while fetching data.');
      setTickets([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to get submitter's directorate and name
  const getSubmitterInfo = (ticket) => {
    if (!ticket.submitted_by) return { directorate: 'Unknown', name: 'N/A' };
    
    const submitter = users.find(user => user.id === ticket.submitted_by);
    return { 
      directorate: submitter?.directorate || 'Unknown', 
      name: submitter?.username || 'N/A' 
    };
  };

  // Function to format dates and times
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const applyFilters = () => {
    let result = [...tickets];
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(ticket => ticket.status === filters.status);
    }
    
    // Apply directorate filter - based on submitter's directorate
    if (filters.directorate) {
      result = result.filter(ticket => getSubmitterInfo(ticket).directorate === filters.directorate);
    }
    
    // Apply category filter
    if (filters.category) {
      result = result.filter(ticket => ticket.category === filters.category);
    }
    
    // Apply priority filter
    if (filters.priority) {
      result = result.filter(ticket => ticket.priority === filters.priority);
    }
    
    // Apply date range filter on creation date
    if (filters.dateFrom) {
      result = result.filter(ticket => new Date(ticket.created_at) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      result = result.filter(ticket => new Date(ticket.created_at) < toDate);
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ticket => 
        ticket.title.toLowerCase().includes(term) || 
        (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(term)) ||
        (ticket.subject && ticket.subject.toLowerCase().includes(term)) ||
        (getSubmitterInfo(ticket).name.toLowerCase().includes(term)) ||
        (getSubmitterInfo(ticket).directorate.toLowerCase().includes(term))
      );
    }
    
    setFilteredTickets(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      directorate: '',
      category: '',
      priority: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchTerm('');
  };

  if (loading) return <div className="loading">Loading reports...</div>;

  // Get unique values for filter dropdowns
  const statusOptions = [...new Set(tickets.map(ticket => ticket.status))];
  const directorateOptions = [...new Set(users.map(user => user.directorate).filter(Boolean))];
  const categoryOptions = [...new Set(tickets.map(ticket => ticket.category))];
  const priorityOptions = [...new Set(tickets.map(ticket => ticket.priority))];

  return (
    <div className="ticket-reports-container card">
      {error && <div className="error-message">{error}</div>}

      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><FaTable /> Ticket Report Details</h2>

      {/* Filters Section */}
      <div className="filters-section card mb-6">
        <h3 className="flex items-center mb-4">
          <FaFilter className="mr-2" /> Filters
        </h3>
        
        <div className="filters-row flex flex-wrap gap-4 mb-4">
          <div className="filter-item">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Directorate</label>
            <select name="directorate" value={filters.directorate} onChange={handleFilterChange}>
              <option value="">All Directorates</option>
              {directorateOptions.map(directorate => (
                <option key={directorate} value={directorate}>{directorate}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Category</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Priority</label>
            <select name="priority" value={filters.priority} onChange={handleFilterChange}>
              <option value="">All Priorities</option>
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="filters-row flex flex-wrap gap-4 mb-4">
          <div className="filter-item">
            <label>Submitted From</label>
            <input 
              type="date" 
              name="dateFrom" 
              value={filters.dateFrom} 
              onChange={handleFilterChange} 
            />
          </div>
          
          <div className="filter-item">
            <label>Submitted To</label>
            <input 
              type="date" 
              name="dateTo" 
              value={filters.dateTo} 
              onChange={handleFilterChange} 
            />
          </div>
          
          <div className="filter-item search-item">            
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchTerm} 
                onChange={handleSearchChange} 
              />
          </div>
          </div>
          
          <div className="filter-item clear-item">
            <label>&nbsp;</label>
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Details Table */}
      <div className="table-responsive">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left">Ticket ID</th>
              <th className="py-2 px-4 border-b text-left">Subject</th>
              <th className="py-2 px-4 border-b text-left">Category</th>
              <th className="py-2 px-4 border-b text-left">Priority</th>
              <th className="py-2 px-4 border-b text-left">Status</th>
              <th className="py-2 px-4 border-b text-left">Directorate</th>
              <th className="py-2 px-4 border-b text-left">Submitted Time</th>
              <th className="py-2 px-4 border-b text-left">Resolved Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-gray-600">No tickets found.</td>
              </tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{ticket.id}</td>
                  <td className="py-2 px-4 border-b">{ticket.subject}</td>
                  <td className="py-2 px-4 border-b">{ticket.category}</td>
                  <td className="py-2 px-4 border-b"><span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span></td>
                  <td className="py-2 px-4 border-b"><span className={`status-badge ${ticket.status}`}>{ticket.status}</span></td>
                  <td className="py-2 px-4 border-b">{getSubmitterInfo(ticket).directorate}</td>
                  <td className="py-2 px-4 border-b">{formatDateTime(ticket.created_at)}</td>
                  <td className="py-2 px-4 border-b">{ticket.resolved_at ? formatDateTime(ticket.resolved_at) : 'Not Resolved'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageTickets;