import { Location } from "src/modules/common/entities/location.entity";
import { User } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CompanyImage } from "./company-image.entity";
import { JobPost } from "src/modules/job/entities/job-post.entity";

@Entity('info_company')
export class Company  {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    companyName: string;

    @Column()
    slug: string;

    @Column({
        default: 'https://res.cloudinary.com/dtnpj540t/image/upload/v1682831706/my-job/images_default/company_image_default.png',
      })
    companyImageUrl: string;


     @Column({
        default: 'https://cdn1.vieclam24h.vn/tvn/images/assets/img/generic_18.jpg',
      })
      companyCoverImageUrl: string;


    
    @Column({ nullable: true  })
    facebookUrl: string;
    @Column({ nullable: true  })
    youtubeUrl: string;
    @Column({ nullable: true  })
    linkedinUrl: string;


    @Column()
    companyEmail: string;


    @Column()
    companyPhone: string;

    @Column()
    websiteUrl: string; 

    @Column()
    taxCode: string;

    @Column()
    since: Date;

    @Column()
    fieldOperation: string

    @Column({ nullable: true  })
    description: string;
    
    @Column()
    employeeSize: number

    @OneToMany(() => CompanyImage, (companyImage) => companyImage.company)
    companyImage: CompanyImage[];



    @ManyToOne(() => Location, { eager: true })
    @JoinColumn()
    location: Location;

    @OneToOne(() => User, { eager: true })
    @JoinColumn()
    user: User;

    @OneToMany(() => JobPost, (jobPost) => jobPost.company)
    jobPosts: JobPost[];

    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
}