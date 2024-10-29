import { ConfigType, registerAs } from '@nestjs/config'

import * as dotenv from 'dotenv'

import { DataSource, DataSourceOptions } from 'typeorm'

import { env, envBoolean, envNumber } from '../global/env'
import { User } from 'src/modules/user/entities/user.entity'
dotenv.config({ path: __dirname + '/config.env' });


const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'db',
  port:5432,
  username: 'postgres',
  password: 'postgres',
  database: 'MyJobAPI',
//   synchronize: envBoolean('DB_SYNCHRONIZE', false),
  entities: [User],
//   migrations: ['dist/migrations/*{.ts,.js}'],



}
export const dbRegToken = 'database'

export const DatabaseConfig = registerAs(
  dbRegToken,
  (): DataSourceOptions => dataSourceOptions,
)

export type IDatabaseConfig = ConfigType<typeof DatabaseConfig>

const dataSource = new DataSource(dataSourceOptions)

export default dataSource
