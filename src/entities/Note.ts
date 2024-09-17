import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { CardBox } from './CardBox'

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null

  @Column({ type: 'varchar', length: 255 })
  cardType!: string

  @Column('simple-json')
  content!: object

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @Column('simple-array')
  tags!: string[]

  @ManyToMany(() => Note, (note) => note.linkedFrom)
  @JoinTable()
  linkedTo!: Note[]

  @ManyToMany(() => Note, (note) => note.linkedTo)
  linkedFrom!: Note[]

  @Column({ type: 'uuid', nullable: true })
  cardBoxId: string | null

  @ManyToOne(() => CardBox, (cardBox) => cardBox.noteIds)
  cardBox: CardBox

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean

  @Column({ type: 'boolean', default: false })
  isStarred!: boolean
}
