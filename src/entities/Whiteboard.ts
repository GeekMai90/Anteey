import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { WhiteboardNote } from './WhiteboardNote'

@Entity()
export class Whiteboard {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => WhiteboardNote, (whiteboardNote) => whiteboardNote.whiteboard)
  notes: WhiteboardNote[]

  @Column('simple-json')
  connections: object[]
}
