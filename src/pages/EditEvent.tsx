import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface EventForm {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  capacity: number;
  ticketPrice: number;
  isLiveTelecast: boolean;
  streamLink: string;
}

const EditEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery(
    ['event', id],
    async () => {
      const response = await api.get(`/events/${id}`);
      return response.data;
    }
  );

  const { register, handleSubmit, formState: { errors }, setError, reset } = useForm<EventForm>();

  React.useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        date: event.date.split('T')[0],
        time: event.time,
        capacity: event.capacity,
        ticketPrice: event.ticketPrice,
        isLiveTelecast: event.isLiveTelecast || false,
        streamLink: event.streamLink || ''
      });
    }
  }, [event, reset]);

  const updateEventMutation = useMutation(
    async (eventData: EventForm) => {
      const response = await api.put(`/events/${id}`, eventData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-events');
        queryClient.invalidateQueries(['event', id]);
        navigate('/admin');
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error && 'response' in error && 
          typeof error.response === 'object' && error.response && 
          'data' in error.response && 
          typeof error.response.data === 'object' && error.response.data &&
          'message' in error.response.data 
          ? String(error.response.data.message) 
          : 'Failed to update event';
        setError('root', { message: errorMessage });
      }
    }
  );

  const onSubmit = (data: EventForm) => {
    updateEventMutation.mutate(data);
  };

  const categories = ['Technology', 'Business', 'Arts', 'Sports', 'Music', 'Education', 'Health', 'Other'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Event</h1>
        <p className="text-gray-600">Update your event details</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title
              </label>
              <input
                {...register('title', {
                  required: 'Title is required',
                  maxLength: { value: 100, message: 'Title cannot exceed 100 characters' }
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                {...register('category', { required: 'Category is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe your event"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              {...register('location', { required: 'Location is required' })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Event location or venue"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                {...register('time', { required: 'Time is required' })}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {errors.time && (
                <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity
              </label>
              <input
                {...register('capacity', {
                  required: 'Capacity is required',
                  min: { value: 1, message: 'Capacity must be at least 1' }
                })}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Maximum attendees"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Price ($)
              </label>
              <input
                {...register('ticketPrice', {
                  required: 'Ticket price is required',
                  min: { value: 0, message: 'Price cannot be negative' }
                })}
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0.00 for free events"
              />
              {errors.ticketPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.ticketPrice.message}</p>
              )}
            </div>
          </div>

          {/* Live Telecast Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Telecast Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    {...register('isLiveTelecast')}
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Live Telecast</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Allow users to watch this event online via live streaming
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream URL
                </label>
                <input
                  {...register('streamLink')}
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://youtube.com/live/your-stream or https://zoom.us/j/your-meeting"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL where users can watch the live stream (YouTube Live, Zoom, etc.)
                </p>
                {errors.streamLink && (
                  <p className="mt-1 text-sm text-red-600">{errors.streamLink.message}</p>
                )}
              </div>
            </div>
          </div>

          {errors.root && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateEventMutation.isLoading}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateEventMutation.isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEvent;