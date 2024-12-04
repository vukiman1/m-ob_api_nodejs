import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Location } from '../common/entities/location.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateJobPostDto, JobPostResponseDto } from './dto/job-post.dto';
import { JobPost } from './entities/job-post.entity';
import { User } from '../user/entities/user.entity';
import { Career } from '../common/entities/carrer.entity';
import { JwtService } from '@nestjs/jwt';
import { JobPostSaved, JobPostSavedResponseDto } from './entities/job-post-saved.entity';
import { JobActivityResponseDto, JobPostActivity } from './entities/job-post-activity.entity';
import { Resume } from '../info/entities/resume.entity';
import { CreateJobPostActivityDto } from './dto/create-job-post-activity.dto';
import { JobPostNotification } from './entities/job-post-notification.entity';
import { City } from '../common/entities/city.entity';
import { CreateJobPostNotificationDto, JobPostNotificationResponseDto } from './dto/create-job-post-notification.dto';

@Injectable()
export class JobService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(JobPost)
    private jobPostRepository: Repository<JobPost>,
    @InjectRepository(JobPostSaved)
    private jobPostSavedRepository: Repository<JobPostSaved>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Career)
    private careerRepository: Repository<Career>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(JobPostActivity)
    private jobPostActivityRepository: Repository<JobPostActivity>,
    @InjectRepository(JobPostNotification)
    private readonly jobPostNotificationRepository: Repository<JobPostNotification>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,

  ) {}

  async createPrivateJobPost(
    createJobPostDto: CreateJobPostDto,
    email: string,
  ) {
    const user = await this.findEmployer(email);
    const career = await this.careerRepository.findOne({
      where: { id: +createJobPostDto.career },
    });
    if (!career) {
      throw new NotFoundException('Career not found');
    }

    const newLocation = this.locationRepository.create({
      city: { id: createJobPostDto.location.city },
      district: { id: createJobPostDto.location.district },
      address: createJobPostDto.location.address,
      lat: createJobPostDto.location.lat,
      lng: createJobPostDto.location.lng,
    });

    const savedLocation = await this.locationRepository.save(newLocation);
    createJobPostDto.slug =
      (await this.generateSlug(createJobPostDto.jobName)) || 'no-name';

    const newJobPost = this.jobPostRepository.create({
      ...createJobPostDto,
      location: savedLocation,
      user: user,
      career: career,
      company: user.company,
    });

    const savedJobPost = await this.jobPostRepository.save(newJobPost);

    return JobPostResponseDto.toResponse(savedJobPost);
  }

  async findEmployer(email: string): Promise<any> {
    const employer = await this.userRepository.findOne({
      where: { email },
      relations: ['company'],
    });
    if (!employer || employer.company == null) {
      throw new NotFoundException('Employer or company not found');
    }

    if (employer.roleName !== 'EMPLOYER') {
      throw new ConflictException('Only employer can create job post');
    }
    return employer;
  }

  async findPrivateJobPosts(filters: any): Promise<any> {
    const { userId, isUrgent, keyword, ordering, page, pageSize, statusId } =
      filters;
    // Tạo truy vấn với các điều kiện tìm kiếm
    const query = this.jobPostRepository
      .createQueryBuilder('job_post')
      .where('job_post.user.id = :userId', { userId }) // Lỗi: thiếu query. ở đây
      .andWhere('job_post.jobName LIKE :kw', { kw: `%${keyword}%` });
    // Kiểm tra nếu có statusId thì thêm điều kiện vào query

    if (isUrgent) {
      query.andWhere('job_post.isUrgent = :isUrgent', { isUrgent });
    }
    if (statusId) {
      query.andWhere('job_post.status = :statusId', { statusId });
    }
    // Sắp xếp theo ordering
    query
      .orderBy(`job_post.${ordering}`, 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    // Thực hiện truy vấn với `try-catch` để kiểm tra lỗi
    const [results, count] = await query.getManyAndCount();
    // Chuẩn bị dữ liệu trả về
    return {
      count,
      results: results.map((job) => ({
        id: job.id,
        slug: job.slug,
        jobName: job.jobName,
        deadline: job.deadline,
        isUrgent: job.isUrgent,
        status: job.status,
        createAt: job.createAt,
        appliedNumber: 0, // Bạn có thể tính toán số lượng ứng viên ở đây nếu cần
        views: job.views,
        isExpired: new Date(job.deadline) < new Date(), // Kiểm tra xem công việc đã hết hạn chưa
      })),
    };
  }

  async findJobPosts(filters: any) {
    const {
      isUrgent,
      careerId,
      keyword,
      ordering,
      page,
      pageSize,
      statusId,
      companyId,
    } = filters;
    // Tạo truy vấn với các điều kiện tìm kiếm
    const query = this.jobPostRepository
      .createQueryBuilder('job_post') // Lỗi: thiếu query. ở đây
      .leftJoinAndSelect('job_post.company', 'company') // Join bảng company
      // .leftJoinAndSelect('job_post.user', 'mobileUser') // Join bảng mobileUser
      .leftJoinAndSelect('job_post.location', 'location') // Join bảng location
      .leftJoinAndSelect('location.city', 'city') // Join bảng city
      .where('job_post.jobName LIKE :kw', { kw: `%${keyword}%` })
      .andWhere('job_post.status = :status', { status: 3 })
      .andWhere('job_post.deadline >= :currentDate', {
        currentDate: new Date().toISOString(),
      });
    if (isUrgent) {
      query.andWhere('job_post.isUrgent = :isUrgent', { isUrgent });
    }

    if (careerId) {
      query.andWhere('job_post.careerId = :careerId', { careerId });
    }

    if (companyId) {
      query.andWhere('company.id = :companyId', { companyId });
    }

    if (statusId) {
      query.andWhere('job_post.status = :statusId', { statusId });
    }
    // Sắp xếp theo ordering
    query
      .orderBy(`job_post.${ordering}`, 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    // Thực hiện truy vấn với `try-catch` để kiểm tra lỗi
    const [results, count] = await query.getManyAndCount();
    // Chuẩn bị dữ liệu trả về
    return {
      count,
      results: results.map((job) => ({
        id: job.id,
        slug: job.slug,
        jobName: job.jobName,
        deadline: job.deadline,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        isHot: job.isHot,
        isUrgent: job.isUrgent,
        companyDict: job.company
          ? {
              id: job.company.id,
              slug: job.company.slug,
              companyName: job.company.companyName,
              employeeSize: job.company.employeeSize,
              companyImageUrl: job.company.companyImageUrl,
            }
          : null,
        locationDict: job.location
          ? {
              city: job.location.city ? job.location.city.id : null,
            }
          : null,
      })),
    };
  }

  async findPrivateJobPostsToExport(filters: any): Promise<any> {
    const { userId, isUrgent, keyword, ordering, page, pageSize, statusId } =
      filters;
    // Tạo truy vấn với các điều kiện tìm kiếm
    const query = this.jobPostRepository
      .createQueryBuilder('job_post')
      .where('job_post.user.id = :userId', { userId }) // Lỗi: thiếu query. ở đây
      .andWhere('job_post.jobName LIKE :kw', { kw: `%${keyword}%` });

    if (isUrgent) {
      query.andWhere('job_post.isUrgent = :isUrgent', { isUrgent });
    }
    // Kiểm tra nếu có statusId thì thêm điều kiện vào query
    // Lỗi dấu phẩy ở đây
    if (statusId) {
      query.andWhere('job_post.status = :statusId', { statusId });
    }
    // Sắp xếp theo ordering
    query.orderBy(`job_post.${ordering}`, 'DESC');
    query.skip((page - 1) * pageSize).take(pageSize);

    // Thực hiện truy vấn với `try-catch` để kiểm tra lỗi
    const [results] = await query.getManyAndCount();
    // Chuẩn bị dữ liệu trả về
    return {
      data: results.map((job, index) => ({
        STT: index + 1,
        'Mã Việc Làm': job.id,
        'Chức danh': job.jobName,
        'Ngày Hết Hạn': job.deadline,
        'Ngày Đăng': job.createAt,
        'Số hồ sơ ứng tuyển': 0,
        'Lượt Xem': job.views,
      })),
    };
  }

  async getPrivateJobPostById(jobId: number, userId: string) {
    const jobPost = await this.jobPostRepository.findOne({
      where: { id: jobId },
      relations: [
        'location',
        'location.city',
        'location.district',
        'company',
        'user',
        'career',
      ],
    });
    if (!jobPost || jobPost.user.id !== userId) {
      throw new NotFoundException('Not found');
    }

    return JobPostResponseDto.toResponse(jobPost);
  }

  async updatePrivateJobPostById(
    jobId: number,
    userId: string,
    updateJobPostDto: CreateJobPostDto,
  ) {
    // Tìm job post hiện tại
    const jobPost = await this.jobPostRepository.findOne({
      where: { id: jobId },
      relations: [
        'location',
        'location.city',
        'location.district',
        'company',
        'user',
        'career',
      ],
    });

    if (!jobPost || jobPost.user.id !== userId) {
      throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    }

    // Kiểm tra và cập nhật career nếu có thay đổi
    if (updateJobPostDto.career) {
      const career = await this.careerRepository.findOne({
        where: { id: +updateJobPostDto.career },
      });
      if (!career) {
        throw new NotFoundException('Không tìm thấy ngành nghề');
      }
      jobPost.career = career;
    }

    // Cập nhật location nếu có thay đổi
    if (updateJobPostDto.location) {
      const updatedLocation = {
        city: { id: updateJobPostDto.location.city },
        district: { id: updateJobPostDto.location.district },
        address: updateJobPostDto.location.address,
        lat: updateJobPostDto.location.lat,
        lng: updateJobPostDto.location.lng,
      };

      await this.locationRepository.update(
        jobPost.location.id,
        updatedLocation,
      );
    }

    // Cập nhật slug nếu tên job thay đổi
    if (updateJobPostDto.jobName !== jobPost.jobName) {
      updateJobPostDto.slug = await this.generateSlug(updateJobPostDto.jobName);
    }

    // Cập nhật các thông tin khác
    Object.assign(jobPost, updateJobPostDto);

    const updatedJobPost = await this.jobPostRepository.save(jobPost);

    return JobPostResponseDto.toResponse(updatedJobPost);
  }

  async findJobPostBySlug(slug: string) {
    const jobPost = await this.jobPostRepository.findOne({
      where: { slug },
      relations: [
        'location',
        'location.city',
        'location.district',
        'company',
        'user',
        'career',
      ],
    });
    return jobPost;
  }

  async getPublicJobPost(slug: string, headers: any) {
    const jobPost = await this.findJobPostBySlug(slug);
    const userId = await this.getUserByHeader(headers);
    let isSaved = null;
    if (userId) {
      isSaved = (await this.checkIsSavedJobPost(slug, userId)).isSaved;
    }

    // Save the job post
    const savedJobPost = await this.jobPostRepository.save(jobPost);

    // Increment the views count
    savedJobPost.views++;
    await this.jobPostRepository.save(savedJobPost);

    return JobPostResponseDto.toResponse({ ...jobPost, isSaved });
  }

  async checkIsSavedJobPost(slug: string, userId: number) {
    const jobPost = await this.findJobPostBySlug(slug);
    const isSaved = await this.jobPostSavedRepository.findOne({
      where: {
        user: { id: userId.toString() },
        jobPost: { id: jobPost.id },
      },
    });
    return { isSaved: !!isSaved, savedId: isSaved?.id };
  }

  async savedJobPost(slug: string, userId: number) {
    const jobPost = await this.findJobPostBySlug(slug);
    const { isSaved, savedId } = await this.checkIsSavedJobPost(slug, userId);

    if (isSaved) {
      await this.jobPostSavedRepository.delete(savedId);
    } else {
      await this.jobPostSavedRepository.save({
        user: { id: userId.toString() },
        jobPost: { id: jobPost.id },
      });
    }

    return !isSaved;
  }

  async getUserByHeader(headers: any) {
    let userId = null;
    const authHeader = headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decodedToken = this.jwtService.verify(token);
        userId = decodedToken.id;
      } catch (error) {
        console.log(error);
        userId = null; // Token không hợp lệ hoặc hết hạn
      }
    }
    return userId;
  }



  async createJobPostActivity(createJobPostActivityDto: CreateJobPostActivityDto): Promise<JobPostActivity> {
    const { email, fullName, job_post, phone, resume } = createJobPostActivityDto;
  
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }
  
    const resumeEntity = await this.resumeRepository.findOne({ where: { id: resume } });
    if (!resumeEntity) {
      throw new Error('Resume not found');
    }
  
    const jobPost = await this.jobPostRepository.findOne({ where: { id: job_post } });
    if (!jobPost) {
      throw new Error('Job post not found');
    }
  
    const jobPostActivity = new JobPostActivity();
    jobPostActivity.fullName = fullName;
    jobPostActivity.email = email;
    jobPostActivity.phone = phone;
    jobPostActivity.user = user;
    jobPostActivity.resume = resumeEntity;
    jobPostActivity.jobPost = jobPost;
  
    return this.jobPostActivityRepository.save(jobPostActivity);
  }


  async getJobPostActivities(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    // Lấy danh sách hoạt động kèm quan hệ liên quan
    const [activities, totalCount] = await this.jobPostActivityRepository.findAndCount({
      skip,
      take: pageSize,
      relations: [
        'jobPost',
        'jobPost.company',
        'user',
        'jobPost.location',
        'resume',
      ],
      order: { createAt: 'DESC' },
    });
    
    // Sử dụng DTO để định dạng kết quả
    const results = activities.map((activity) => JobActivityResponseDto.toResponse(activity));
  
    return {
      count: totalCount,
      results,
    };
  }

  async getJobPostNotifications(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [notifications, totalCount] = await this.jobPostNotificationRepository.findAndCount({
      skip,
      take: pageSize,
      relations: ['career', 'city'],
      order: { createAt: 'DESC' },
    });


    const results = notifications.map((notification) =>
      JobPostNotificationResponseDto.toResponse(notification),
    );

    return {
      count: totalCount,
      results,
    };
  }

  async getSavedJobPosts(page: number, pageSize: number, userId: number) {
    const skip = (page - 1) * pageSize;
    const currentDate = new Date();
    // Lấy danh sách các JobPost đã lưu
    const [savedJobs, totalCount] = await this.jobPostSavedRepository.findAndCount({
      where: { user: { id: userId.toString() },
        jobPost: {
        deadline: MoreThanOrEqual(currentDate), // Deadline >= hôm nay
        status: 3, // Chỉ lấy công việc đang hoạt động
      },},
      relations: ['jobPost', 'jobPost.company', 'user', 'jobPost.location', 'jobPost.location.city'],
      skip,
      take: pageSize,
      order: { createAt: 'DESC' },
    });
  
    // Định dạng dữ liệu trả về
    const results = savedJobs.map((savedJob) => {
      const jobPost = savedJob.jobPost;
      return JobPostSavedResponseDto.toResponse(jobPost, true); // isApplied = true
    });
  
    return {
      count: totalCount,
      results,
    };
  }
  


  async createJobPostNotification(
    createJobPostNotificationDto: CreateJobPostNotificationDto,
  ) {
    const { jobName, position, experience, salary, frequency, career, city } = createJobPostNotificationDto;

    // Fetch related entities (career and city) in parallel
    const [careerEntity, cityEntity] = await Promise.all([
      this.careerRepository.findOne({ where: { id: career } }),
      this.cityRepository.findOne({ where: { id: city } }),
    ]);

    // Check if the entities exist
    if (!careerEntity) throw new NotFoundException('Career not found');
    if (!cityEntity) throw new NotFoundException('City not found');

    // Create and save the notification
    const notification = this.jobPostNotificationRepository.create({
      jobName,
      position,
      experience,
      salary,
      frequency,
      career: careerEntity,
      city: cityEntity,
    });

    const savedNotification = await this.jobPostNotificationRepository.save(notification);

    // Return the result in the required format
    return {
      id: savedNotification.id,
      jobName: savedNotification.jobName,
      salary: savedNotification.salary,
      frequency: savedNotification.frequency,
      career: savedNotification.career.id,
      city: savedNotification.city.id,
    };
  }

  async toggleActiveStatus(id: number): Promise<JobPostNotification> {
    const notification = await this.jobPostNotificationRepository.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Job post notification not found');
    }

    notification.isActive = !notification.isActive;
    return this.jobPostNotificationRepository.save(notification);
  }

  async generateSlug(companyName: string): Promise<string> {
    // Tạo slug cơ bản từ tên công ty
    let slug = companyName
      .toLowerCase()
      .normalize('NFD') // Loại bỏ dấu tiếng Việt
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ các ký tự dấu
      .replace(/[^a-z0-9 ]/g, '') // Giữ lại chữ cái và số
      .trim()
      .replace(/\s+/g, '-'); // Chuyển khoảng trắng thành dấu "-"

    // Kiểm tra xem slug đã tồn tại trong cơ sở dữ liệu chưa
    let isSlugExist = await this.jobPostRepository.findOne({ where: { slug } });
    // Nếu slug đã tồn tại, thêm hậu tố số vào
    let counter = 1;
    while (isSlugExist) {
      const match = slug.match(/-(\d+)$/); // Kiểm tra xem slug có kết thúc bằng một số không

      if (match) {
        // Nếu có, cộng thêm 1 vào số đó
        counter = parseInt(match[1], 10) + 1;
        slug = slug.replace(/-(\d+)$/, `-${counter}`); // Cập nhật slug với số mới
      } else {
        // Nếu không có số, thêm "-1" vào cuối
        slug = `${slug}-1`;
      }

      // Kiểm tra lại xem slug có tồn tại không
      isSlugExist = await this.jobPostRepository.findOne({ where: { slug } });
    }

    return slug;
  }
}
