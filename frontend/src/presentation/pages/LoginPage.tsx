import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import { ApiClient } from '@infrastructure/api/api-client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const apiClient = new ApiClient();
  const userApiClient = new UserApiClient(apiClient);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await userApiClient.createUser({ email, name });
      localStorage.setItem('userId', user.id);
      navigate('/alerts');
    } catch (err) {
      setError('Failed to create user');
    }
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        {error && <div>{error}</div>}
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
