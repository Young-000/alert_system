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
  public password?: string;
  public location?: UserLocation;
  public phoneNumber?: string;

  constructor(
    email: string,
    name: string,
    location?: UserLocation,
    id?: string,
    phoneNumber?: string,
    password?: string
  ) {
    this.id = id || uuidv4();
    this.email = email;
    this.name = name;
    this.location = location;
    this.phoneNumber = phoneNumber;
    this.password = password;
  }

  updateLocation(location: UserLocation): void {
    this.location = location;
  }

  updatePhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber;
  }

  updatePassword(hashedPassword: string): void {
    this.password = hashedPassword;
  }
}

