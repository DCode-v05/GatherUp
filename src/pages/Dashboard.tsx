import React from 'react';
import { useQuery } from 'react-query';
import { Calendar, MapPin, Ticket, QrCode, DollarSign, Video, ExternalLink, Eye } from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const { data: registrations, isLoading } = useQuery(
    'my-registrations',
    async () => {
      const response = await api.get('/registrations/my-events');
      return response.data;
    }
  );

  const generateQRCode = async (registrationCode: string) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(registrationCode);
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Event Ticket - ${registrationCode}</title></head>
            <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif;">
              <h2>Your Event Ticket</h2>
              <img src="${qrCodeDataURL}" alt="QR Code" />
              <p>Registration Code: ${registrationCode}</p>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('QR Code generation failed:', error);
      alert('Failed to generate QR code. Please try again.');
    }
  };

  const handleJoinLiveStream = async (eventId: string) => {
    try {
      const response = await api.post(`/events/${eventId}/registered-viewer-join`);
      if (response.data.streamLink) {
        window.open(response.data.streamLink, '_blank', 'noopener,noreferrer');
      } else {
        alert('Stream link not available');
      }
    } catch (error) {
      console.error('Failed to join live stream:', error);
      alert('Failed to join live stream. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Events</h1>
        <p className="text-gray-600">Manage your event registrations and tickets</p>
      </div>

      {registrations?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Ticket className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No registered events</h3>
          <p className="text-gray-600 mb-6">You haven't registered for any events yet</p>
          <a
            href="/events"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium inline-block"
          >
            Browse Events
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {registrations?.map((registration: typeof registrations[0]) => (
            <div key={registration._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                <Calendar className="h-12 w-12 text-white opacity-50" />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    registration.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : registration.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Code: {registration.registrationCode}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {registration.eventId.title}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(new Date(registration.eventId.date), 'MMM dd, yyyy')} at {registration.eventId.time}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    {registration.eventId.location}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {registration.eventId.ticketPrice === 0 ? 'Free Event' : `₹${registration.eventId.ticketPrice}`}
                  </div>
                  
                  {/* Live Telecast Status */}
                  {registration.eventId.isLiveTelecast && (
                    <div className="flex items-center text-sm">
                      <Video className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="text-purple-600 font-medium">Live Telecast Available</span>
                      {registration.eventId.isStreamActive && (
                        <>
                          <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          <span className="ml-1 text-red-600 text-xs font-bold">LIVE</span>
                          {registration.eventId.liveViewerCount !== undefined && (
                            <div className="ml-2 flex items-center space-x-1 text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs">{registration.eventId.liveViewerCount}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => generateQRCode(registration.registrationCode)}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-center font-medium flex items-center justify-center space-x-2"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Generate Ticket</span>
                  </button>
                  
                  {/* Live Stream Button */}
                  {registration.eventId.isLiveTelecast && registration.eventId.isStreamActive && (
                    <button
                      onClick={() => handleJoinLiveStream(registration.eventId._id)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center font-medium flex items-center justify-center space-x-2"
                    >
                      <Video className="h-4 w-4" />
                      <span>Join Live</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;