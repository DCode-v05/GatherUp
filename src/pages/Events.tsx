import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Search, Calendar, MapPin, Users, Video, Eye, Edit, Trash2, VideoOff } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  capacity: number;
  ticketPrice: number;
  registeredCount: number;
  imageUrl?: string;
  isLiveTelecast?: boolean;
  isStreamActive?: boolean;
  liveViewerCount?: number;
}

const Events: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    startDate: '',
    endDate: ''
  });

  const { data, isLoading, error } = useQuery(
    ['events', filters, isAdmin],
    async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Add admin-only filter if user is admin
      if (isAdmin) {
        params.append('adminOnly', 'true');
      }
      
      const response = await api.get(`/events?${params.toString()}`);
      return response.data;
    },
    { keepPreviousData: true }
  );

  // Delete event mutation
  const deleteEventMutation = useMutation(
    async (eventId: string) => {
      await api.delete(`/events/${eventId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['events']);
      }
    }
  );

  // Toggle stream mutation
  const toggleStreamMutation = useMutation(
    async ({ eventId, isStreamActive }: { eventId: string; isStreamActive: boolean }) => {
      const response = await api.put(`/events/${eventId}/live-telecast`, {
        isStreamActive: !isStreamActive
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['events']);
      }
    }
  );

  const categories = ['Technology', 'Business', 'Arts', 'Sports', 'Music', 'Education', 'Health', 'Other'];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleToggleStream = (eventId: string, isStreamActive: boolean) => {
    toggleStreamMutation.mutate({ eventId, isStreamActive });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading events</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {isAdmin ? 'My Created Events' : 'Discover Events'}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {isAdmin 
            ? 'Manage and monitor your created events, live streams, and registrations'
            : 'Find amazing events happening near you and connect with your community'
          }
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {data?.events?.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.events?.map((event: Event) => (
            <div key={event._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <div className="h-48 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                <Calendar className="h-16 w-16 text-white opacity-50" />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    {event.category}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {event.ticketPrice === 0 ? 'Free' : `₹${event.ticketPrice}`}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {event.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(new Date(event.date), 'MMM dd, yyyy')} at {event.time}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    {event.registeredCount}/{event.capacity} registered
                  </div>
                  
                  {/* Live Telecast Indicator */}
                  {event.isLiveTelecast && (
                    <div className="flex items-center text-sm">
                      <Video className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="text-purple-600 font-medium">Live Telecast</span>
                      {event.isStreamActive && (
                        <>
                          <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          <span className="ml-1 text-red-600 text-xs font-bold">LIVE NOW</span>
                          {event.liveViewerCount !== undefined && event.liveViewerCount > 0 && (
                            <div className="ml-2 flex items-center space-x-1 text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs">{event.liveViewerCount}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Link
                    to={`/events/${event._id}`}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-center block font-medium"
                  >
                    View Details
                  </Link>
                  
                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="flex space-x-2">
                      {/* Edit Button */}
                      <Link
                        to={`/admin/edit-event/${event._id}`}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium flex items-center justify-center space-x-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </Link>
                      
                      {/* Stream Toggle Button (only for live telecast events) */}
                      {event.isLiveTelecast && (
                        <button
                          onClick={() => handleToggleStream(event._id, event.isStreamActive || false)}
                          disabled={toggleStreamMutation.isLoading}
                          className={`flex-1 py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-1 text-xs disabled:opacity-50 ${
                            event.isStreamActive
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {event.isStreamActive ? (
                            <>
                              <VideoOff className="h-3 w-3" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Video className="h-3 w-3" />
                              <span>Start</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteEvent(event._id, event.title)}
                        disabled={deleteEventMutation.isLoading}
                        className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-1 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <nav className="flex space-x-2">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`px-4 py-2 rounded-lg font-medium ${
                  page === data.currentPage
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default Events;