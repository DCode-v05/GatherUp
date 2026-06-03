import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Users, MapPin } from 'lucide-react';
import api from '../services/api';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  maxAttendees: number;
  capacity: number;
  registeredCount: number;
  price?: number;
  organizer: string;
  isLiveTelecast?: boolean;
  isStreamActive?: boolean;
  liveViewerCount?: number;
  createdAt: string;
  updatedAt: string;
}

const AdminDashboard: React.FC = () => {
  const { data: events, isLoading } = useQuery<Event[]>(
    'admin-events',
    async () => {
      const response = await api.get('/events?adminOnly=true');
      return response.data.events || response.data;
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your events and monitor registrations</p>
        </div>
        <Link
          to="/admin/create-event"
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-gray-900">
                {events?.reduce((sum: number, event: Event) => sum + event.registeredCount, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events?.filter((event: Event) => new Date(event.date) > new Date()).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/admin/create-event"
              className="bg-purple-50 border border-purple-200 rounded-lg p-6 hover:bg-purple-100 transition-colors text-center"
            >
              <Plus className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Event</h3>
              <p className="text-gray-600">Start creating your next amazing event</p>
            </Link>
            
            <Link
              to="/events"
              className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors text-center"
            >
              <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Events</h3>
              <p className="text-gray-600">View, edit, and manage your created events</p>
            </Link>
            
            <Link
              to="/dashboard"
              className="bg-green-50 border border-green-200 rounded-lg p-6 hover:bg-green-100 transition-colors text-center"
            >
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Registrations</h3>
              <p className="text-gray-600">Check registered users for your events</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
        <p className="mb-4 opacity-90">
          Visit our help center or contact support if you need assistance managing your events.
        </p>
        <div className="flex space-x-4">
          <a
            href="#"
            className="bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Help Center
          </a>
          <a
            href="#"
            className="bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;