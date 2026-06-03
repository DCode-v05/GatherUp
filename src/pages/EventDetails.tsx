import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Calendar, MapPin, Users, User, Ticket, Video, ExternalLink, Eye } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [joiningStream, setJoiningStream] = useState(false);
  const [joiningPublicStream, setJoiningPublicStream] = useState(false);

  const { data: event, isLoading } = useQuery(
    ['event', id],
    async () => {
      const response = await api.get(`/events/${id}`);
      return response.data;
    }
  );

  // Check stream access for authenticated users
  const { data: streamAccess, refetch: refetchStreamAccess } = useQuery(
    ['stream-access', id],
    async () => {
      if (!isAuthenticated || !id) return null;
      const response = await api.get(`/events/${id}/stream-access`);
      return response.data;
    },
    {
      enabled: !!isAuthenticated && !!id,
      retry: false,
      staleTime: 30000 // 30 seconds
    }
  );

  const registerMutation = useMutation(
    async () => {
      const response = await api.post(`/registrations/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['event', id]);
        queryClient.invalidateQueries(['stream-access', id]);
        setRegistering(false);
      },
      onError: () => {
        setRegistering(false);
      }
    }
  );

  const joinStreamMutation = useMutation(
    async () => {
      const response = await api.post(`/events/${id}/registered-viewer-join`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setJoiningStream(false);
        // Open stream link in new window
        if (data.streamLink) {
          window.open(data.streamLink, '_blank', 'noopener,noreferrer');
        } else {
          alert('Stream link not available. Please contact the event organizer.');
        }
        // Refetch event data to get updated viewer count
        queryClient.invalidateQueries(['event', id]);
      },
      onError: (error: unknown) => {
        setJoiningStream(false);
        console.error('Join stream error:', error);
        
        // Show specific error messages
        let errorMessage = 'Failed to join live stream. ';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
          if (axiosError.response?.data?.message) {
            errorMessage += axiosError.response.data.message;
          } else if (axiosError.response?.status === 403) {
            errorMessage += 'You must be registered for this event to join the live stream.';
          } else if (axiosError.response?.status === 400) {
            errorMessage += 'Live stream is not currently active.';
          } else {
            errorMessage += 'Please try again or contact support.';
          }
        } else {
          errorMessage += 'Please try again or contact support.';
        }
        
        alert(errorMessage);
      }
    }
  );

  const handleRegister = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRegistering(true);
    registerMutation.mutate();
  };

  const handleJoinLiveStream = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setJoiningStream(true);
    joinStreamMutation.mutate();
  };

  const refreshStreamAccess = () => {
    refetchStreamAccess();
  };

  const handleJoinPublicStream = async () => {
    setJoiningPublicStream(true);
    try {
      const response = await api.post(`/events/${id}/public-stream-join`);
      const data = response.data;
      
      // Open stream link in new window
      if (data.streamLink) {
        window.open(data.streamLink, '_blank', 'noopener,noreferrer');
      }
      
      // Refetch event data to get updated viewer count
      queryClient.invalidateQueries(['event', id]);
      
    } catch (error) {
      console.error('Failed to join public stream:', error);
      
      // Show specific error messages
      let errorMessage = 'Failed to join live stream. ';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
        if (axiosError.response?.data?.message) {
          errorMessage += axiosError.response.data.message;
        } else if (axiosError.response?.status === 400) {
          errorMessage += 'Live stream is not currently active.';
        } else {
          errorMessage += 'Please try again or contact support.';
        }
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      alert(errorMessage);
    } finally {
      setJoiningPublicStream(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Event not found</p>
          <button 
            onClick={() => navigate('/events')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const isEventFull = event.registeredCount >= event.maxAttendees;
  const isEventPast = new Date(event.date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center text-gray-600 hover:text-purple-600 mb-6 transition-colors"
        >
          ← Back to Events
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Event Header */}
          <div className="p-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <span className="bg-white/20 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                {event.category}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full ${
                isEventPast
                  ? 'bg-gray-500/20 text-gray-200'
                  : 'bg-green-500/20 text-green-200'
              }`}>
                {isEventPast ? 'Past Event' : 'Upcoming'}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
            <p className="text-purple-100 text-lg leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Event Details */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Event Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Date & Time</p>
                      <p className="text-gray-600">
                        {format(new Date(event.date), 'EEEE, MMMM do, yyyy')} at {event.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Capacity</p>
                      <p className="text-gray-600">
                        {event.registeredCount} / {event.maxAttendees} registered
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Organizer</p>
                      <p className="text-gray-600">{event.organizerName}</p>
                    </div>
                  </div>

                  {event.ticketPrice && event.ticketPrice > 0 && (
                    <div className="flex items-center space-x-3">
                      <Ticket className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Price</p>
                        <p className="text-gray-600">₹{event.ticketPrice}</p>
                      </div>
                    </div>
                  )}

                  {/* Live Telecast Info */}
                  {event.isLiveTelecast && (
                    <div className="flex items-center space-x-3">
                      <Video className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Live Telecast</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-gray-600">Available</p>
                          {event.isStreamActive && (
                            <>
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                              <span className="text-red-600 text-sm font-medium">LIVE</span>
                              {event.liveViewerCount !== undefined && (
                                <div className="flex items-center space-x-1 text-gray-500 text-sm">
                                  <Eye className="h-3 w-3" />
                                  <span>{event.liveViewerCount} viewers</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration & Live Stream Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Registration & Access</h3>
                
                {/* Live Stream Access for Registered Users */}
                {event.isLiveTelecast && isAuthenticated && streamAccess && (
                  <div className="mb-6">
                    {streamAccess.hasAccess ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <Video className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium text-green-800">Live Stream Access</h4>
                        </div>
                        <p className="text-green-700 mb-4">
                          ✓ You're registered! You can watch the live stream for free.
                        </p>
                        <div className="text-sm text-green-600 mb-4">
                          Registration: {streamAccess.registrationCode} 
                          {streamAccess.paymentStatus === 'pending' && ' (Payment Pending - but you can still watch!)'}
                        </div>
                        {event.isStreamActive ? (
                          <button
                            onClick={handleJoinLiveStream}
                            disabled={joiningStream}
                            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
                          >
                            <Video className="h-4 w-4" />
                            <span>{joiningStream ? 'Joining...' : 'Join Live Stream'}</span>
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="text-center">
                            <p className="text-green-700 mb-3">Stream not active yet</p>
                            <button
                              onClick={refreshStreamAccess}
                              className="bg-green-100 text-green-800 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm"
                            >
                              Refresh Status
                            </button>
                          </div>
                        )}
                      </div>
                    ) : streamAccess.needsRegistration ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Video className="h-5 w-5 text-yellow-600" />
                          <h4 className="font-medium text-yellow-800">Live Stream Available</h4>
                        </div>
                        <p className="text-yellow-700">
                          Register for this event to get free access to the live stream!
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Video className="h-5 w-5 text-gray-600" />
                          <h4 className="font-medium text-gray-800">Live Stream</h4>
                        </div>
                        <p className="text-gray-700">{streamAccess.message}</p>
                        {streamAccess.canAccessWhenActive && (
                          <p className="text-sm text-gray-600 mt-2">
                            You'll be able to watch when the stream becomes active.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Regular Registration */}
                {!isAuthenticated ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-800 mb-4">Please log in to register for this event.</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Login to Register
                    </button>
                  </div>
                ) : (
                  <div>
                    {isEventPast ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <p className="text-gray-600 text-center">This event has already passed.</p>
                      </div>
                    ) : isEventFull ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                        <p className="text-red-800 text-center font-medium mb-4">This event is fully booked.</p>
                        {event.isLiveTelecast && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <div className="flex items-center justify-center space-x-2 mb-3">
                              <Video className="h-5 w-5 text-blue-600" />
                              <h4 className="font-medium text-blue-800">Watch Live Stream Instead!</h4>
                            </div>
                            <p className="text-blue-700 text-sm text-center mb-4">
                              Even though tickets are sold out, you can still watch this event live online.
                            </p>
                            {event.isStreamActive ? (
                              <div className="space-y-3">
                                <button
                                  onClick={handleJoinPublicStream}
                                  disabled={joiningPublicStream}
                                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
                                >
                                  <Video className="h-4 w-4" />
                                  <span>{joiningPublicStream ? 'Joining...' : 'Watch Live Stream'}</span>
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                                {event.liveViewerCount > 0 && (
                                  <div className="flex items-center justify-center space-x-1 text-sm text-blue-600">
                                    <Eye className="h-4 w-4" />
                                    <span>{event.liveViewerCount} people watching</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-blue-700 text-sm mb-3">Live stream will start when the event begins</p>
                                <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm">
                                  Check back later or bookmark this page
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : event.isRegistered ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <p className="text-green-800 text-center font-medium mb-4">
                          ✓ You're registered for this event!
                        </p>
                        <div className="text-center">
                          <p className="text-green-700 text-sm mb-4">Your QR code:</p>
                          <div className="inline-block bg-white p-4 rounded-lg border">
                            <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                              QR Code
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        {event.ticketPrice && event.ticketPrice > 0 ? (
                          <p className="text-purple-800 mb-4 text-center">
                            Registration fee: <span className="font-bold">₹{event.ticketPrice}</span>
                          </p>
                        ) : (
                          <p className="text-purple-800 mb-4 text-center">Free Event</p>
                        )}
                        <button
                          onClick={handleRegister}
                          disabled={registering}
                          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {registering ? 'Registering...' : 'Register Now'}
                        </button>
                        {event.isLiveTelecast && (
                          <p className="text-sm text-purple-600 mt-3 text-center">
                            💡 Registered users get free access to live stream!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
