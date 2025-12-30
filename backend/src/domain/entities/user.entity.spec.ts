import { User } from './user.entity';

describe('User', () => {
  it('should create a user with required fields', () => {
    const user = new User('user@example.com', 'John Doe');
    
    expect(user.email).toBe('user@example.com');
    expect(user.name).toBe('John Doe');
    expect(user.id).toBeDefined();
  });

  it('should create a user with optional location', () => {
    const location = { address: 'Seoul', lat: 37.5665, lng: 126.9780 };
    const user = new User('user@example.com', 'John Doe', location);
    
    expect(user.location).toEqual(location);
  });

  it('should update user location', () => {
    const user = new User('user@example.com', 'John Doe');
    const newLocation = { address: 'Busan', lat: 35.1796, lng: 129.0756 };
    
    user.updateLocation(newLocation);
    
    expect(user.location).toEqual(newLocation);
  });
});

