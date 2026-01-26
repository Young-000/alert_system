import { v4 as uuidv4 } from 'uuid';

export interface UserLocation {
  address: string;
  lat: number;
  lng: number;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly name: string;
  public phoneNumber: string;
  public passwordHash?: string;
  public location?: UserLocation;
  public googleId?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(
    email: string,
    name: string,
    phoneNumber: string,
    passwordHash?: string,
    location?: UserLocation,
    googleId?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id || uuidv4();
    this.email = email;
    this.name = name;
    this.phoneNumber = phoneNumber;
    this.passwordHash = passwordHash;
    this.location = location;
    this.googleId = googleId;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  updateLocation(location: UserLocation): void {
    this.location = location;
    this.updatedAt = new Date();
  }

  updatePassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
  }
}

