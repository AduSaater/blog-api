import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/providers/users.service';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ResendOtpDto } from '../dtos/resend-otp.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyAccountDto } from '../dtos/verify-account.dto';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { GenerateTokensProvider } from './generate-tokens.provider';
import { HashingProvider } from './hashing.provider';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly hashingProvider: HashingProvider,
    private readonly generateTokensProvider: GenerateTokensProvider,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper: Generate a secure 6-digit numeric OTP string
   */
  private generateSixDigitOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Register a new user account & dispatch verification OTP
   */
  public async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    const hashedPassword = await this.hashingProvider.hashPassword(
      registerDto.password,
    );

    // Generate 6-digit OTP and hash it for secure storage
    const otp = this.generateSixDigitOtp();
    const hashedOtp = await this.hashingProvider.hashPassword(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await this.usersService.createUser({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      otp: hashedOtp,
      otpExpires,
      otpPurpose: OtpPurpose.ACCOUNT_VERIFICATION,
      lastOtpSentAt: new Date(),
    });

    // Send email via Gmail
    await this.mailService.sendAccountVerificationOtp(
      newUser.email,
      newUser.firstName,
      otp,
    );

    return {
      message:
        'Account created successfully. A 6-digit verification code has been sent to your email address.',
      userId: newUser._id,
      email: newUser.email,
    };
  }

  /**
   * Verify account using 6-digit OTP code
   */
  public async verifyAccount(verifyAccountDto: VerifyAccountDto) {
    const user = await this.usersService.findOneByEmail(
      verifyAccountDto.email,
    );
    if (!user) {
      throw new NotFoundException('User account was not found.');
    }

    if (user.isVerified) {
      throw new BadRequestException('This account is already verified.');
    }

    if (
      !user.otp ||
      !user.otpExpires ||
      user.otpPurpose !== OtpPurpose.ACCOUNT_VERIFICATION
    ) {
      throw new BadRequestException(
        'No pending account verification request found for this user.',
      );
    }

    if (new Date() > user.otpExpires) {
      throw new BadRequestException(
        'The verification code has expired. Please request a new one.',
      );
    }

    const isMatch = await this.hashingProvider.comparePassword(
      verifyAccountDto.otp,
      user.otp,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid verification code.');
    }

    // Generate tokens to log the user in immediately
    const tokens = await this.generateTokensProvider.generateTokens(user);
    const hashedRefreshToken = await this.hashingProvider.hashPassword(
      tokens.refreshToken,
    );

    const updatedUser = await this.usersService.updateUser(user._id.toString(), {
      isVerified: true,
      otp: undefined,
      otpExpires: undefined,
      otpPurpose: undefined,
      refreshToken: hashedRefreshToken,
    });

    return {
      message: 'Account verified successfully.',
      tokens,
      user: updatedUser,
    };
  }

  /**
   * Resend account verification OTP with a 60-second cooldown
   */
  public async resendOtp(resendOtpDto: ResendOtpDto) {
    const user = await this.usersService.findOneByEmail(resendOtpDto.email);
    if (!user) {
      throw new NotFoundException('User account was not found.');
    }

    if (user.isVerified) {
      throw new BadRequestException('This account is already verified.');
    }

    // Cooldown check (60 seconds)
    if (user.lastOtpSentAt) {
      const diffMs = Date.now() - new Date(user.lastOtpSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (diffMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - diffMs) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        );
      }
    }

    const otp = this.generateSixDigitOtp();
    const hashedOtp = await this.hashingProvider.hashPassword(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.updateUser(user._id.toString(), {
      otp: hashedOtp,
      otpExpires,
      otpPurpose: OtpPurpose.ACCOUNT_VERIFICATION,
      lastOtpSentAt: new Date(),
    });

    await this.mailService.sendAccountVerificationOtp(
      user.email,
      user.firstName,
      otp,
    );

    return {
      message: 'A new verification code has been sent to your email address.',
    };
  }

  /**
   * Log in user and generate access & refresh tokens
   */
  public async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await this.hashingProvider.comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in.',
      );
    }

    const tokens = await this.generateTokensProvider.generateTokens(user);
    const hashedRefreshToken = await this.hashingProvider.hashPassword(
      tokens.refreshToken,
    );

    await this.usersService.updateUser(user._id.toString(), {
      refreshToken: hashedRefreshToken,
    });

    return {
      message: 'Logged in successfully.',
      tokens,
      user,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  public async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.usersService.findOneById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      const isRefreshTokenValid = await this.hashingProvider.comparePassword(
        refreshTokenDto.refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const tokens = await this.generateTokensProvider.generateTokens(user);
      const hashedRefreshToken = await this.hashingProvider.hashPassword(
        tokens.refreshToken,
      );

      await this.usersService.updateUser(user._id.toString(), {
        refreshToken: hashedRefreshToken,
      });

      return {
        message: 'Tokens refreshed successfully.',
        tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  /**
   * Request password reset code via Gmail
   */
  public async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findOneByEmail(
      forgotPasswordDto.email,
    );

    // If user does not exist, return a generic message to prevent email harvesting
    if (!user) {
      return {
        message:
          'If an account with that email address exists, a password reset code has been sent.',
      };
    }

    // Cooldown check (60 seconds)
    if (user.lastOtpSentAt) {
      const diffMs = Date.now() - new Date(user.lastOtpSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (diffMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - diffMs) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        );
      }
    }

    const otp = this.generateSixDigitOtp();
    const hashedOtp = await this.hashingProvider.hashPassword(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.updateUser(user._id.toString(), {
      otp: hashedOtp,
      otpExpires,
      otpPurpose: OtpPurpose.PASSWORD_RESET,
      lastOtpSentAt: new Date(),
    });

    await this.mailService.sendPasswordResetOtp(
      user.email,
      user.firstName,
      otp,
    );

    return {
      message:
        'If an account with that email address exists, a password reset code has been sent.',
    };
  }

  /**
   * Reset password using OTP code
   */
  public async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findOneByEmail(
      resetPasswordDto.email,
    );
    if (!user) {
      throw new NotFoundException('User account was not found.');
    }

    if (
      !user.otp ||
      !user.otpExpires ||
      user.otpPurpose !== OtpPurpose.PASSWORD_RESET
    ) {
      throw new BadRequestException(
        'No pending password reset request found for this user.',
      );
    }

    if (new Date() > user.otpExpires) {
      throw new BadRequestException(
        'The password reset code has expired. Please request a new one.',
      );
    }

    const isMatch = await this.hashingProvider.comparePassword(
      resetPasswordDto.otp,
      user.otp,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid password reset code.');
    }

    const newHashedPassword = await this.hashingProvider.hashPassword(
      resetPasswordDto.newPassword,
    );

    await this.usersService.updateUser(user._id.toString(), {
      password: newHashedPassword,
      otp: undefined,
      otpExpires: undefined,
      otpPurpose: undefined,
      refreshToken: undefined, // Revoke current sessions
    });

    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Change password for authenticated user
   */
  public async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersService.findOneByIdOrThrow(userId);

    const isPasswordValid = await this.hashingProvider.comparePassword(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password does not match.');
    }

    const newHashedPassword = await this.hashingProvider.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.usersService.updateUser(userId, {
      password: newHashedPassword,
      refreshToken: undefined, // Invalidate old refresh token
    });

    return {
      message:
        'Password updated successfully. Please log in again with your new password.',
    };
  }

  /**
   * Get authenticated user profile
   */
  public async getMe(userId: string) {
    return await this.usersService.findOneByIdOrThrow(userId);
  }
}
