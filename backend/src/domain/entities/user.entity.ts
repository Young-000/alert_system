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
  public location?: UserLocation;

  constructor(email: string, name: string, location?: UserLocation, id?: string) {
    this.id = id || uuidv4();
    this.email = email;
    this.name = name;
    this.location = location;
  }

  updateLocation(location: UserLocation): void {
    this.location = location;
  }
}

