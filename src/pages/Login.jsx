import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <div className="glass" style={{ padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '2rem' }}>Infinit Login</h2>
        {error && <div style={{ background: 'rgba(255,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'var(--secondary-color)', 
              color: 'white', 
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        <div style={{ marginTop: '20px' }}>
          Need an account? <Link to="/signup" style={{ color: '#fff', textDecoration: 'underline' }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
