import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { JobSeekerRegisterDto } from './dto/job_seaker-auth.dto';
import { ErrorEnum } from 'src/constants/error-code.constant';
import { JobSeekerProfile } from '../info/entities/job_seeker_profle.entities';
import { JwtService } from '@nestjs/jwt';
import { AuthCredDto, AuthGetTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  static findUserByEmail(email: string) {
    throw new Error('Method not implemented.');
  }

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        @InjectRepository(JobSeekerProfile)
        private jobSeekerProfileRepository: Repository<JobSeekerProfile>,
      ) {}

      //Job Seeker
      async job_seeker_register_services(jobSeekerRegisterDto: JobSeekerRegisterDto) {
        const user = await this.findUserByEmail(jobSeekerRegisterDto.email)
        if (user) {
           throw new ConflictException(ErrorEnum.SYSTEM_USER_EXISTS);
        }

        //hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(jobSeekerRegisterDto.password, salt);
        jobSeekerRegisterDto.password = hashedPassword;

        //tạo mới user trong csdl
        const newJobSeeker = this.userRepository.create({  ...jobSeekerRegisterDto });
        const savedUser = await this.userRepository.save(newJobSeeker);


         // Tạo bản ghi job_seeker_profile liên kết với user vừa tạo
        const newJobSeekerProfile = this.jobSeekerProfileRepository.create({
          user: savedUser,
        });
        await this.jobSeekerProfileRepository.save(newJobSeekerProfile);


        return savedUser;
      }



      //Employee

      
      async findUserByEmail(email:string):Promise<User> {
        return this.userRepository.findOne({ where: { email } });
      }
      
      //all
      async get_user_info(email: string):Promise<any> {
        const user = await this.userRepository.findOne({
          where: { email },
          relations: ['jobSeekerProfile'], // Liên kết với bảng JobSeekerProfile
        });
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          isActive: user.isActive,
          isVerifyEmail: user.isVerifyEmail,
          avatarUrl: user.avatarUrl,
          roleName: user.roleName,
          jobSeekerProfileId: user.jobSeekerProfile?.id,
          jobSeekerProfile: {
            id: user.jobSeekerProfile?.id,
            phone: user.jobSeekerProfile?.phone,
          },
          companyId: null,
          company: null
        };
      }
      async check_creds_services(authCredDto:AuthCredDto):Promise<any> {
        const user = await this.findUserByEmail(authCredDto.email);
        if (!user ) {
          return {
            email: authCredDto.email,
            email_verified:false,
            exists:false
          }
        }

        if (!user.isVerifyEmail) {
          return {
            email: authCredDto.email,
            email_verified:false,
            exists:true
          }
        }
        
        return {
          email: authCredDto.email,
          email_verified:true,
          exists:true
        }
    }

    async get_token_services(authGetTokenDto:AuthGetTokenDto):Promise<any> {
  
      const user = await this.validate_user(authGetTokenDto)
  
      if (user) {
        return {
          errors: {},
          scope: "read write",
          token_type :"Bearer",
          backend: "backend",
          refresh_token: this.jwtService.sign({ ...user }, { expiresIn: '7d' }),
          access_token:  this.jwtService.sign({ ...user}), // Tạo JWT token
        };
      }
     
    }


    async revokeToken(token: string): Promise<void> {
      // Giải mã token để lấy thông tin
      try {
        const decodedToken = this.jwtService.decode(token);
        console.log(token);
        // Kiểm tra token hợp lệ không
        if (!decodedToken) {
          throw new Error('Token không hợp lệ');
        }
        // Lưu token vào bảng revoked_tokens
        // const revokedToken = this.revokedTokenRepository.create({ token });
        // await this.revokedTokenRepository.save(revokedToken);
        console.log('Token đã bị thu hồi');
      } catch (error) {
        console.error('Lỗi khi thu hồi token:', error);
        throw new Error('Thu hồi token thất bại');
      }
    }
    

    async validate_user(authGetTokenDto:AuthGetTokenDto): Promise<any> {
      const user = await this.findUserByEmail(authGetTokenDto.email);

      if (user && await bcrypt.compare(authGetTokenDto.password, user.password)) {
        const { id, roleName, email } = user;
        return { id, roleName, email };
      }
  
      throw new NotFoundException(`User not found!`)
    }


    async get_user_info_services() {

    }
  }