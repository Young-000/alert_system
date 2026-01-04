import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  location?: {
    address: string;
    lat: number;
    lng: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
