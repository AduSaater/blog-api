import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUser } from './decorators/active-user.decorator';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RegisterDto } from './dtos/register.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { VerifyAccountDto } from './dtos/verify-account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActiveUserData } from './interfaces/active-user-data.interface';
import { AuthService } from './providers/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a new inactive user account and sends a 6-digit verification OTP to the user email via Gmail.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully and OTP sent.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  public async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user account with OTP',
    description:
      'Verifies the 6-digit OTP sent to the user email, activates the account, and returns JWT tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account successfully verified and user logged in.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or expired OTP.',
  })
  public async verifyAccount(@Body() verifyAccountDto: VerifyAccountDto) {
    return this.authService.verifyAccount(verifyAccountDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend account verification OTP',
    description:
      'Generates a new 6-digit OTP and sends it via Gmail. Subject to a 60-second cooldown rate limit.',
  })
  @ApiResponse({
    status: 200,
    description: 'New OTP sent to email.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cooldown in effect or account already verified.',
  })
  public async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user with email and password',
    description:
      'Validates credentials, checks verification status, and returns JWT access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or unverified account.',
  })
  public async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for a new access token and rotated refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  public async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset OTP',
    description:
      'Dispatches a 6-digit password reset OTP to the registered email address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP dispatched if account exists.',
  })
  public async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using OTP',
    description:
      'Validates the 6-digit OTP and updates the account password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP code.',
  })
  public async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password (authenticated)',
    description:
      'Allows an authenticated user to change their password by validating their old password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Old password is incorrect.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  public async changePassword(
    @ActiveUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  public async getMe(@ActiveUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
