import { useState, useEffect } from 'react';
import { AlertApiClient } from '@infrastructure/api/alert-api.client';
import { ApiClient } from '@infrastructure/api/api-client';
import { Alert, CreateAlertDto } from '@infrastructure/api/alert-api.client';
import { usePushNotification } from '../hooks/usePushNotification';
import { ApiClient as NotificationApiClient } from '@infrastructure/api/api-client';

export function AlertSettingsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('0 8 * * *');
  const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const apiClient = new ApiClient();
  const alertApiClient = new AlertApiClient(apiClient);
  const notificationApiClient = new NotificationApiClient();
  const userId = localStorage.getItem('userId') || '';
  const { permission, subscribe, requestPermission } = usePushNotification();

  useEffect(() => {
    loadAlerts();
    if (permission === 'granted') {
      subscribe().then((sub) => {
        if (sub && userId) {
          notificationApiClient.post('/notifications/subscribe', {
            userId,
            ...sub,
          });
        }
      });
    }
  }, [permission]);

  const loadAlerts = async () => {
    try {
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch (err) {
      setError('Failed to load alerts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const dto: CreateAlertDto = {
        userId,
        name,
        schedule,
        alertTypes: alertTypes as any,
      };
      await alertApiClient.createAlert(dto);
      setName('');
      setSchedule('0 8 * * *');
      setAlertTypes([]);
      loadAlerts();
    } catch (err) {
      setError('Failed to create alert');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alertApiClient.deleteAlert(id);
      loadAlerts();
    } catch (err) {
      setError('Failed to delete alert');
    }
  };

  const toggleAlertType = (type: string) => {
    if (alertTypes.includes(type)) {
      setAlertTypes(alertTypes.filter((t) => t !== type));
    } else {
      setAlertTypes([...alertTypes, type]);
    }
  };

  return (
    <div>
      <h1>Alert Settings</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Alert Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="schedule">Schedule (Cron)</label>
          <input
            id="schedule"
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Alert Types</label>
          {['weather', 'airQuality', 'bus', 'subway'].map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={alertTypes.includes(type)}
                onChange={() => toggleAlertType(type)}
              />
              {type}
            </label>
          ))}
        </div>
        {error && <div>{error}</div>}
        <button type="submit">Create Alert</button>
      </form>
      {permission !== 'granted' && (
        <div>
          <button onClick={requestPermission}>Enable Push Notifications</button>
        </div>
      )}
      <div>
        <h2>Existing Alerts</h2>
        {alerts.map((alert) => (
          <div key={alert.id}>
            <h3>{alert.name}</h3>
            <p>Schedule: {alert.schedule}</p>
            <p>Types: {alert.alertTypes.join(', ')}</p>
            <button onClick={() => handleDelete(alert.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
