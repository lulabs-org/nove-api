# Requirements Document

## Introduction

This document specifies the requirements for an API Key Management Platform module for the Lulab backend system. The module enables multi-tenant organizations to generate, manage, and authenticate external API access using secure API keys, similar to OpenAI/DeepSeek platforms. The system supports role-based access control, scope-based permissions, key rotation, revocation, and comprehensive usage auditing.

## Glossary

- **API Key**: A cryptographic credential used to authenticate external API requests
- **Organization**: A tenant entity in the multi-tenant system, identified by Organization.id
- **Key Hash**: A one-way cryptographic hash of the API key stored in the database
- **Prefix**: A unique, human-readable identifier extracted from the API key for fast lookup
- **Scope**: A permission string that defines what resources an API key can access
- **Key Rotation**: The process of generating a new API key while revoking the old one
- **Usage Log**: An audit record of API key usage including request details and outcomes
- **Admin Interface**: Backend management endpoints requiring authenticated user access with RBAC
- **External API**: Public-facing endpoints that accept API key authentication
- **HMAC-SHA256**: Hash-based Message Authentication Code using SHA-256 algorithm
- **System**: The Lulab backend NestJS application

## Requirements

### Requirement 1

**User Story:** As a backend administrator, I want to create API keys for my organization, so that external systems can authenticate and access our APIs.

#### Acceptance Criteria

1. WHEN an authenticated administrator submits a key creation request with name, optional scopes, and optional expiration date, THEN the System SHALL generate a unique API key with prefix and secret components
2. WHEN the System generates an API key, THEN the System SHALL compute and store only the HMAC-SHA256 hash of the complete key using a server secret
3. WHEN the System creates an API key, THEN the System SHALL return the plaintext key exactly once in the creation response
4. WHEN the System stores an API key, THEN the System SHALL associate it with the administrator's organization ID for multi-tenant isolation
5. WHEN the System generates a key prefix, THEN the System SHALL ensure the prefix is unique across all organizations

### Requirement 2

**User Story:** As a backend administrator, I want to list all API keys for my organization, so that I can monitor and manage active credentials.

#### Acceptance Criteria

1. WHEN an authenticated administrator requests the API key list, THEN the System SHALL return only keys belonging to the administrator's organization
2. WHEN the System returns API key list data, THEN the System SHALL include id, name, prefix, last4 characters, status, scopes, expiration date, creation date, and last used timestamp
3. WHEN the System returns API key list data, THEN the System SHALL NOT include the plaintext key or key hash
4. WHERE pagination is implemented, WHEN an administrator requests a page of keys, THEN the System SHALL return the specified page with total count metadata

### Requirement 3

**User Story:** As a backend administrator, I want to update API key metadata, so that I can modify key properties without regenerating credentials.

#### Acceptance Criteria

1. WHEN an authenticated administrator updates an API key name, THEN the System SHALL persist the new name while maintaining the same key credentials
2. WHEN an authenticated administrator updates API key scopes, THEN the System SHALL replace the existing scopes with the new scope array
3. WHEN an authenticated administrator updates the expiration date, THEN the System SHALL validate that the new date is in the future
4. WHEN an administrator attempts to update an API key, THEN the System SHALL verify the key belongs to the administrator's organization

### Requirement 4

**User Story:** As a backend administrator, I want to revoke API keys immediately, so that I can disable compromised or unused credentials.

#### Acceptance Criteria

1. WHEN an authenticated administrator revokes an API key, THEN the System SHALL set the key status to REVOKED and record the revocation timestamp
2. WHEN the System revokes an API key, THEN the System SHALL prevent all subsequent authentication attempts using that key
3. WHEN an administrator attempts to revoke an API key, THEN the System SHALL verify the key belongs to the administrator's organization
4. WHEN the System revokes an API key, THEN the System SHALL maintain the key record for audit purposes

### Requirement 5

**User Story:** As a backend administrator, I want to rotate API keys, so that I can refresh credentials periodically without service interruption.

#### Acceptance Criteria

1. WHEN an authenticated administrator rotates an API key, THEN the System SHALL generate a new API key with new prefix, secret, and hash
2. WHEN the System rotates an API key, THEN the System SHALL automatically revoke the old key
3. WHEN the System rotates an API key, THEN the System SHALL return the new plaintext key exactly once
4. WHEN the System rotates an API key, THEN the System SHALL record the rotation relationship between old and new keys
5. WHEN the System rotates an API key, THEN the System SHALL preserve the name and scopes from the original key

### Requirement 6

**User Story:** As an external system, I want to authenticate API requests using an API key, so that I can access protected resources.

#### Acceptance Criteria

1. WHEN an external system sends a request with an API key in the Authorization Bearer header, THEN the System SHALL extract and validate the key
2. WHEN an external system sends a request with an API key in the x-api-key header, THEN the System SHALL extract and validate the key
3. WHEN the System validates an API key, THEN the System SHALL extract the prefix, query the database, and compare the HMAC-SHA256 hash
4. WHEN the System validates an API key, THEN the System SHALL verify the key status is ACTIVE
5. WHEN the System validates an API key, THEN the System SHALL verify the key has not expired by comparing current time with expiresAt
6. WHEN the System successfully validates an API key, THEN the System SHALL attach authentication context containing organizationId, apiKeyId, and scopes to the request

### Requirement 7

**User Story:** As an external system, I want my API requests to be authorized based on scopes, so that access is limited to permitted resources.

#### Acceptance Criteria

1. WHEN an external system accesses a scope-protected endpoint, THEN the System SHALL verify the API key contains at least one required scope
2. WHEN the System checks scopes, THEN the System SHALL compare the endpoint's required scopes against the API key's granted scopes
3. WHEN an API key lacks required scopes, THEN the System SHALL reject the request with HTTP 403 status
4. WHEN an endpoint requires multiple scopes, THEN the System SHALL verify the API key contains all required scopes

### Requirement 8

**User Story:** As a system operator, I want all API key usage logged, so that I can audit access patterns and investigate security incidents.

#### Acceptance Criteria

1. WHEN an external system makes an API request using an API key, THEN the System SHALL record the request method, path, status code, latency, IP address, and user agent
2. WHEN the System logs API key usage, THEN the System SHALL associate the log entry with the apiKeyId and organizationId
3. WHEN the System logs API key usage, THEN the System SHALL NOT record the plaintext API key
4. WHEN an API request fails authentication, THEN the System SHALL log the failure with error details
5. WHEN the System writes usage logs, THEN the System SHALL include a timestamp for temporal analysis

### Requirement 9

**User Story:** As a backend administrator, I want API key operations protected by RBAC, so that only authorized users can manage keys.

#### Acceptance Criteria

1. WHEN a user attempts to access API key management endpoints, THEN the System SHALL verify the user is authenticated
2. WHEN a user attempts to access API key management endpoints, THEN the System SHALL verify the user has the api_keys:manage permission
3. WHEN the System enforces RBAC, THEN the System SHALL integrate with existing authentication guards and permission systems

### Requirement 10

**User Story:** As a security engineer, I want API keys to follow a secure format, so that keys are identifiable, unique, and cryptographically strong.

#### Acceptance Criteria

1. WHEN the System generates an API key, THEN the System SHALL format it as sk_<env>_<prefix>.<secret>
2. WHEN the System generates a key prefix, THEN the System SHALL use 8-12 characters of base32 or base64url encoding
3. WHEN the System generates a key secret, THEN the System SHALL use 32-48 characters of base64url encoding with cryptographic randomness
4. WHEN the System stores an API key, THEN the System SHALL store only the HMAC-SHA256 hash computed with a server secret
5. WHEN the System stores an API key, THEN the System SHALL store the last 4 characters for display purposes

### Requirement 11

**User Story:** As a system operator, I want multi-tenant isolation enforced, so that organizations cannot access each other's API keys.

#### Acceptance Criteria

1. WHEN the System queries API keys, THEN the System SHALL filter by organizationId
2. WHEN the System performs API key operations, THEN the System SHALL verify the key belongs to the requesting organization
3. WHEN the System creates usage logs, THEN the System SHALL associate logs with the correct organizationId for tenant isolation

### Requirement 12

**User Story:** As a developer, I want a demonstration endpoint, so that I can verify API key authentication is working correctly.

#### Acceptance Criteria

1. WHEN an external system sends a GET request to /v1/me with a valid API key, THEN the System SHALL return the organizationId, apiKeyId, and scopes
2. WHEN the System responds to /v1/me, THEN the System SHALL NOT include sensitive key material in the response
