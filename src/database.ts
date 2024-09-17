import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Note } from './entities/Note'
import { CardBox } from './entities/CardBox'
import { Whiteboard } from './entities/Whiteboard'
import { WhiteboardNote } from './entities/WhiteboardNote'

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: 'notes.db',
  synchronize: true,
  logging: false,
  entities: [Note, CardBox, Whiteboard, WhiteboardNote],
  migrations: [],
  subscribers: []
})
