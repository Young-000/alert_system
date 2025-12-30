export class CreateUserDto {
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

