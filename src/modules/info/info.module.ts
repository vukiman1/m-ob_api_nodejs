import { Module } from '@nestjs/common';
import { InfoService } from './info.service';
import { InfoController, InfoController2 } from './info.controller';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { JobSeekerProfile } from './entities/job_seeker_profle.entities';
import { Company } from './entities/company.entity';
import { Location } from '../common/entities/location.entity';
import { CompanyImage } from './entities/company-image.entity';
import { City } from '../common/entities/city.entity';
import { District } from '../common/entities/district.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CompanyFollowed } from './entities/company-followed.entity';
import { AuthModule } from '../auth/auth.module';
import { JobPost } from '../job/entities/job-post.entity';
import { Resume } from './entities/resume.entity';
import { ResumeViewed } from './entities/resume-viewed.entity';
import { ResumeSaved } from './entities/resume-saved.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      JobSeekerProfile,
      Company,
      Location,
      CompanyImage,
      City,
      District,
      CompanyFollowed,
      JobPost,
      JobSeekerProfile,
      Resume,
      ResumeViewed,
      ResumeSaved,
    ]),
    UserModule,
    CloudinaryModule,
    AuthModule,
  ],
  exports: [InfoService],
  controllers: [InfoController, InfoController2],
  providers: [InfoService, UserService],
})
export class InfoModule {}
