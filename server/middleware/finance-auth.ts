import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';

/**
 * PART 6: FINANCE_ADMIN Authorization Middleware
 * 
 * Only users with FINANCE_ADMIN role can perform payout operations
 */
export interface FinanceAuthRequest extends AuthRequest {
  user: {
    id: string;
    role: string;
  };
}

export const requireFinanceAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ensure user is authenticated (handled by authenticateAdmin)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has FINANCE_ADMIN role
    const userRole = req.user.role || 'ADMIN';
    
    if (userRole !== 'FINANCE_ADMIN') {
      return res.status(403).json({ 
        error: 'Access denied. FINANCE_ADMIN role required for payout operations.',
        requiredRole: 'FINANCE_ADMIN',
        userRole: userRole
      });
    }

    next();
  } catch (error) {
    console.error('Finance auth error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Get user role from request
 */
export const getUserRole = (req: AuthRequest): string => {
  return req.user?.role || 'ADMIN';
};
