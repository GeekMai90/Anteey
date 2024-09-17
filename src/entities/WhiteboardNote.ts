import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Whiteboard } from './Whiteboard'
import { Note } from './Note'

@Entity()
export class WhiteboardNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => Whiteboard, (whiteboard) => whiteboard.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'whiteboardId' })
  whiteboard!: Whiteboard

  @Column('uuid')
  whiteboardId!: string

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note!: Note

  @Column('uuid')
  noteId!: string

  @Column('float')
  positionX!: number

  @Column('float')
  positionY!: number

  @Column('float', { default: 1 })
  scale!: number

  @Column('float', { default: 0 })
  rotation!: number
}
